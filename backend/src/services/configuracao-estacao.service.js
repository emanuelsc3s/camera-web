const fs = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');

const auditService = require('./audit.service');
const produtosService = require('./produtos.service');
const database = require('../config/database');
const { env } = require('../config/env');
const { formatProductReference, normalizeText } = require('../utils/formatters');
const { HttpError, notFound } = require('../utils/http-error');

const LINHA_KEY = 'CAMERA_WEB_LINHA_PRODUCAO_ID';
const ESTACAO_KEY = 'CAMERA_WEB_ESTACAO_NOME';
const ESTACAO_MAX_LENGTH = 80;

let writeQueue = Promise.resolve();

function getEnvFilePath() {
  return process.env.CAMERA_WEB_ENV_PATH || path.join(env.rootDir, '.env');
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const parsed = Number.parseInt(text, 10);
  return parsed > 0 ? parsed : null;
}

function parseRequiredLinha(value) {
  const parsed = parsePositiveInteger(value);

  if (!parsed) {
    throw new HttpError(400, "Campo 'linhaProducaoId' deve ser um número inteiro positivo.", {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  return parsed;
}

function parseEstacaoNome(value) {
  const text = normalizeText(value);

  if (!text) {
    throw new HttpError(400, "Campo 'estacaoNome' é obrigatório.", {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  if (text.length > ESTACAO_MAX_LENGTH) {
    throw new HttpError(400, `Campo 'estacaoNome' deve ter no máximo ${ESTACAO_MAX_LENGTH} caracteres.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  return text;
}

async function readEnvFile() {
  try {
    return await fs.readFile(getEnvFilePath(), 'utf8');
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      return '';
    }

    throw erro;
  }
}

async function readEnvValues() {
  const content = await readEnvFile();
  return dotenv.parse(content);
}

async function getConfiguracaoAtual() {
  const fileValues = await readEnvValues();
  const linhaProducaoId = parsePositiveInteger(
    fileValues[LINHA_KEY] ?? process.env[LINHA_KEY],
  );
  const estacaoNome = normalizeText(fileValues[ESTACAO_KEY] ?? process.env[ESTACAO_KEY]);

  return {
    configurado: Boolean(linhaProducaoId),
    linhaProducaoId,
    estacaoNome: estacaoNome || '',
  };
}

function getLinhaProducaoIdConfigurada() {
  return parsePositiveInteger(process.env[LINHA_KEY]);
}

function requireLinhaProducaoConfigurada() {
  const linhaProducaoId = getLinhaProducaoIdConfigurada();

  if (!linhaProducaoId) {
    throw new HttpError(409, 'Estação não configurada. Defina a linha de produção antes de iniciar inspeções.', {
      code: 'ESTACAO_NAO_CONFIGURADA',
    });
  }

  return linhaProducaoId;
}

async function getLinhaProducaoIdOperacional() {
  const configuracao = await getConfiguracaoAtual();

  if (!configuracao.linhaProducaoId) {
    throw new HttpError(409, 'Estação não configurada. Defina a linha de produção antes de iniciar inspeções.', {
      code: 'ESTACAO_NAO_CONFIGURADA',
    });
  }

  return configuracao.linhaProducaoId;
}

function formatEnvValue(value) {
  const text = String(value);

  if (/^[A-Za-z0-9_.:/\\-]+$/.test(text)) {
    return text;
  }

  return JSON.stringify(text);
}

function updateEnvContent(content, values) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content ? content.split(/\r?\n/) : [];
  const pendingKeys = new Set(Object.keys(values));

  const updatedLines = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);

    if (!match) {
      return line;
    }

    const key = match[1];
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      return line;
    }

    pendingKeys.delete(key);
    return `${key}=${formatEnvValue(values[key])}`;
  });

  if (pendingKeys.size) {
    if (updatedLines.length && updatedLines[updatedLines.length - 1] !== '') {
      updatedLines.push('');
    }

    updatedLines.push('# Configuração operacional da estação Camera Web');

    pendingKeys.forEach((key) => {
      updatedLines.push(`${key}=${formatEnvValue(values[key])}`);
    });
  }

  return updatedLines.join(eol);
}

function enqueueWrite(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

async function writeStationEnv(values) {
  return enqueueWrite(async () => {
    const envFilePath = getEnvFilePath();
    const envDir = path.dirname(envFilePath);
    const tempFilePath = `${envFilePath}.${process.pid}.${Date.now()}.tmp`;
    const content = await readEnvFile();
    const nextContent = updateEnvContent(content, values);

    await fs.mkdir(envDir, { recursive: true });
    await fs.writeFile(tempFilePath, nextContent, 'utf8');
    await fs.rename(tempFilePath, envFilePath);

    process.env[LINHA_KEY] = String(values[LINHA_KEY]);
    process.env[ESTACAO_KEY] = String(values[ESTACAO_KEY]);
  });
}

async function validarLinhaProducao(linhaProducaoId) {
  const rows = await database.query(
    `
      SELECT FIRST 1 LINHAPRODUCAO_ID
      FROM TBLINHA_PRODUCAO
      WHERE LINHAPRODUCAO_ID = ?
    `,
    [linhaProducaoId],
  );

  if (!rows[0]) {
    throw notFound('Linha de produção não encontrada.');
  }

  return rows[0];
}

async function getOpAtivaFormatada(linhaProducaoId) {
  const row = await produtosService.getOpAtivaPorLinha(linhaProducaoId);
  return row ? formatProductReference(row) : null;
}

async function getContextoEstacao() {
  const configuracao = await getConfiguracaoAtual();
  const opAtiva = configuracao.linhaProducaoId
    ? await getOpAtivaFormatada(configuracao.linhaProducaoId)
    : null;

  return {
    ...configuracao,
    opAtiva,
  };
}

async function testarOpAtiva(linhaProducaoId) {
  const linha = parseRequiredLinha(linhaProducaoId);
  await validarLinhaProducao(linha);

  return {
    linhaProducaoId: linha,
    opAtiva: await getOpAtivaFormatada(linha),
  };
}

async function salvarConfiguracao(data, audit) {
  const anterior = await getConfiguracaoAtual();
  const linhaProducaoId = parseRequiredLinha(data.linhaProducaoId);
  const estacaoNome = parseEstacaoNome(data.estacaoNome);

  await validarLinhaProducao(linhaProducaoId);
  await writeStationEnv({
    [LINHA_KEY]: linhaProducaoId,
    [ESTACAO_KEY]: estacaoNome,
  });

  await auditService.registerAccessEvent({
    usuarioId: audit.usuarioId,
    usuarioNome: audit.usuarioNome,
    local: 'CONFIG_ESTACAO',
    tipo: 'CONFIG_UPDATE',
    atividade: {
      linhaAnterior: anterior.linhaProducaoId,
      linhaNova: linhaProducaoId,
      estacaoAnterior: anterior.estacaoNome,
      estacaoNova: estacaoNome,
    },
    online: 'S',
    ip: audit.ip,
    computador: audit.computador,
    chaveId: linhaProducaoId,
  });

  return getContextoEstacao();
}

module.exports = {
  ESTACAO_KEY,
  LINHA_KEY,
  getConfiguracaoAtual,
  getContextoEstacao,
  getLinhaProducaoIdOperacional,
  getLinhaProducaoIdConfigurada,
  requireLinhaProducaoConfigurada,
  salvarConfiguracao,
  testarOpAtiva,
  validarLinhaProducao,
};
