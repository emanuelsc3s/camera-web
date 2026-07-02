const fs = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');

const auditService = require('./audit.service');
const produtosService = require('./produtos.service');
const database = require('../config/database');
const { env, refreshFirebirdEnv } = require('../config/env');
const {
  decryptSecret,
  encryptSecret,
  generateCryptoKey,
  isEncryptedSecret,
} = require('../utils/config-crypto');
const { formatProductReference, formatValidade, normalizeText } = require('../utils/formatters');
const { HttpError, notFound } = require('../utils/http-error');

const LINHA_KEY = 'CAMERA_WEB_LINHA_PRODUCAO_ID';
const ESTACAO_KEY = 'CAMERA_WEB_ESTACAO_NOME';
const CRYPTO_KEY = 'CAMERA_WEB_CONFIG_CRYPTO_KEY';
const FIREBIRD_KEYS = {
  host: 'FIREBIRD_HOST',
  port: 'FIREBIRD_PORT',
  database: 'FIREBIRD_DATABASE',
  user: 'FIREBIRD_USER',
  password: 'FIREBIRD_PASSWORD',
  role: 'FIREBIRD_ROLE',
  charset: 'FIREBIRD_CHARSET',
  pageSize: 'FIREBIRD_PAGE_SIZE',
  poolMax: 'FIREBIRD_POOL_MAX',
  connectTimeoutMs: 'FIREBIRD_CONNECT_TIMEOUT_MS',
};
const ESTACAO_MAX_LENGTH = 80;
const FIREBIRD_TEXT_MAX_LENGTH = 512;
const DEFAULT_LINHA_PAGE_TOTAL = 0;
const DEFAULT_OP_PAGE_TOTAL = 0;

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

function parseRequiredText(value, fieldName, maxLength = FIREBIRD_TEXT_MAX_LENGTH) {
  const text = normalizeText(value);

  if (!text) {
    throw new HttpError(400, `Campo '${fieldName}' é obrigatório.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  if (text.length > maxLength) {
    throw new HttpError(400, `Campo '${fieldName}' deve ter no máximo ${maxLength} caracteres.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  return text;
}

function parseOptionalText(value, fieldName, maxLength = FIREBIRD_TEXT_MAX_LENGTH) {
  const text = normalizeText(value);

  if (!text) {
    return '';
  }

  if (text.length > maxLength) {
    throw new HttpError(400, `Campo '${fieldName}' deve ter no máximo ${maxLength} caracteres.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  return text;
}

function parseRequiredInteger(value, fieldName, minimum) {
  const text = String(value ?? '').trim();

  if (!/^\d+$/.test(text)) {
    throw new HttpError(400, `Campo '${fieldName}' deve ser um número inteiro.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  const parsed = Number.parseInt(text, 10);
  if (parsed < minimum) {
    throw new HttpError(400, `Campo '${fieldName}' deve ser maior ou igual a ${minimum}.`, {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  return parsed;
}

function parseEnvInteger(value, defaultValue, minimum) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed < minimum ? defaultValue : parsed;
}

function normalizeFirebirdCharset(value) {
  const charset = String(value || 'WIN1252').trim().toUpperCase();
  return charset === 'UTF-8' ? 'UTF8' : charset || 'WIN1252';
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

function updateEnvContent(content, values, heading) {
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

    updatedLines.push(heading);

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

async function writeEnvValues(values, heading) {
  return enqueueWrite(async () => {
    const envFilePath = getEnvFilePath();
    const envDir = path.dirname(envFilePath);
    const tempFilePath = `${envFilePath}.${process.pid}.${Date.now()}.tmp`;
    const content = await readEnvFile();
    const nextContent = updateEnvContent(content, values, heading);

    await fs.mkdir(envDir, { recursive: true });
    await fs.writeFile(tempFilePath, nextContent, 'utf8');
    await fs.rename(tempFilePath, envFilePath);

    Object.entries(values).forEach(([key, value]) => {
      process.env[key] = String(value ?? '');
    });
  });
}

async function writeStationEnv(values) {
  return writeEnvValues(values, '# Configuração operacional da estação Camera Web');
}

function getEnvValue(fileValues, key, defaultValue = '') {
  return fileValues[key] ?? process.env[key] ?? defaultValue;
}

function decryptFirebirdPassword(rawPassword, cryptoKey) {
  try {
    return decryptSecret(rawPassword || '', cryptoKey || '');
  } catch (erro) {
    throw new HttpError(400, 'Senha do Firebird criptografada com chave inválida ou ausente.', {
      code: 'FIREBIRD_SENHA_INVALIDA',
    });
  }
}

function formatFirebirdConfig(fileValues) {
  const rawPassword = getEnvValue(fileValues, FIREBIRD_KEYS.password);
  const cryptoKey = getEnvValue(fileValues, CRYPTO_KEY);
  const passwordEncrypted = isEncryptedSecret(rawPassword);
  let passwordConfigured = false;

  try {
    passwordConfigured = Boolean(decryptFirebirdPassword(rawPassword, cryptoKey));
  } catch (erro) {
    passwordConfigured = Boolean(rawPassword);
  }

  return {
    host: parseOptionalText(getEnvValue(fileValues, FIREBIRD_KEYS.host, '127.0.0.1'), 'host') || '127.0.0.1',
    port: parseEnvInteger(getEnvValue(fileValues, FIREBIRD_KEYS.port), 3050, 1),
    database: parseOptionalText(getEnvValue(fileValues, FIREBIRD_KEYS.database), 'database'),
    user: parseOptionalText(getEnvValue(fileValues, FIREBIRD_KEYS.user, 'SYSDBA'), 'user') || 'SYSDBA',
    role: parseOptionalText(getEnvValue(fileValues, FIREBIRD_KEYS.role), 'role'),
    charset: normalizeFirebirdCharset(getEnvValue(fileValues, FIREBIRD_KEYS.charset, 'WIN1252')),
    pageSize: parseEnvInteger(getEnvValue(fileValues, FIREBIRD_KEYS.pageSize), 4096, 1024),
    poolMax: parseEnvInteger(getEnvValue(fileValues, FIREBIRD_KEYS.poolMax), 5, 1),
    connectTimeoutMs: parseEnvInteger(getEnvValue(fileValues, FIREBIRD_KEYS.connectTimeoutMs), 10000, 0),
    passwordConfigured,
    passwordEncrypted,
  };
}

async function getConfiguracaoFirebirdAtual() {
  const fileValues = await readEnvValues();
  return formatFirebirdConfig(fileValues);
}

async function getFirebirdPasswordAtual(fileValues) {
  const rawPassword = getEnvValue(fileValues, FIREBIRD_KEYS.password);
  const cryptoKey = getEnvValue(fileValues, CRYPTO_KEY);
  return decryptFirebirdPassword(rawPassword, cryptoKey);
}

function parseFirebirdPayload(data) {
  return {
    host: parseRequiredText(data.host, 'host'),
    port: parseRequiredInteger(data.port, 'port', 1),
    database: parseRequiredText(data.database, 'database'),
    user: parseRequiredText(data.user, 'user', 80),
    role: parseOptionalText(data.role, 'role', 80),
    charset: normalizeFirebirdCharset(parseRequiredText(data.charset, 'charset', 32)),
    pageSize: parseRequiredInteger(data.pageSize, 'pageSize', 1024),
    poolMax: parseRequiredInteger(data.poolMax, 'poolMax', 1),
    connectTimeoutMs: parseRequiredInteger(data.connectTimeoutMs, 'connectTimeoutMs', 0),
  };
}

function hasPasswordInput(data) {
  return Object.prototype.hasOwnProperty.call(data, 'password') && String(data.password) !== '';
}

function buildFirebirdAudit(anterior, novo, senhaAlterada) {
  return {
    hostAnterior: anterior.host,
    hostNovo: novo.host,
    portaAnterior: anterior.port,
    portaNova: novo.port,
    bancoAnterior: anterior.database,
    bancoNovo: novo.database,
    usuarioAnterior: anterior.user,
    usuarioNovo: novo.user,
    roleAnterior: anterior.role || '',
    roleNova: novo.role || '',
    charsetAnterior: anterior.charset,
    charsetNovo: novo.charset,
    pageSizeAnterior: anterior.pageSize,
    pageSizeNovo: novo.pageSize,
    poolMaxAnterior: anterior.poolMax,
    poolMaxNovo: novo.poolMax,
    timeoutAnterior: anterior.connectTimeoutMs,
    timeoutNovo: novo.connectTimeoutMs,
    senhaAlterada,
    senhaCriptografada: true,
  };
}

async function writeFirebirdEnv(values) {
  return writeEnvValues(values, '# Firebird 2.5');
}

async function validarLinhaProducao(linhaProducaoId) {
  const rows = await database.query(
    `
      SELECT FIRST 1
        LINHAPRODUCAO_ID,
        LINHAPRODUCAO
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

function formatOpCadastrada(row) {
  const linhaProducaoId = row.LINHAPRODUCAO_ID;
  const linhaProducao = normalizeText(row.LINHAPRODUCAO) ||
    (linhaProducaoId ? `LINHA_${linhaProducaoId}` : '');

  return {
    opId: row.OP_ID ?? null,
    op: normalizeText(row.OP),
    status: normalizeText(row.STATUS),
    linhaProducaoId,
    linhaProducao,
    produto: normalizeText(row.PRODUTO),
    lote: normalizeText(row.LOTE),
    validade: formatValidade(row.VALIDADE),
  };
}

function formatLinhaProducao(row) {
  const linhaProducaoId = row.LINHAPRODUCAO_ID;
  const linhaProducao = normalizeText(row.LINHAPRODUCAO) || `LINHA_${linhaProducaoId}`;

  return {
    linhaProducaoId,
    linhaProducao,
  };
}

async function listarLinhasProducao({ page, limit, startRow, endRow }) {
  const countRows = await database.query(`
    SELECT COUNT(*) AS TOTAL
    FROM TBLINHA_PRODUCAO
    WHERE COALESCE(DELETADO, 'N') = 'N'
  `);

  const total = Number(countRows[0]?.TOTAL ?? DEFAULT_LINHA_PAGE_TOTAL);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  const rows = await database.query(
    `
      SELECT
        LINHAPRODUCAO_ID,
        LINHAPRODUCAO
      FROM TBLINHA_PRODUCAO
      WHERE COALESCE(DELETADO, 'N') = 'N'
      ORDER BY LINHAPRODUCAO_ID
      ROWS ? TO ?
    `,
    [startRow, endRow],
  );

  return {
    data: rows.map(formatLinhaProducao),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

async function listarOpsCadastradas({ page, limit, startRow, endRow }) {
  const countRows = await database.query(`
    SELECT COUNT(*) AS TOTAL
    FROM TBOP
    WHERE COALESCE(DELETADO, 'N') = 'N'
  `);

  const total = Number(countRows[0]?.TOTAL ?? DEFAULT_OP_PAGE_TOTAL);
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  const rows = await database.query(
    `
      SELECT
        OP_ID,
        OP,
        STATUS,
        LINHAPRODUCAO_ID,
        LINHAPRODUCAO,
        PRODUTO,
        LOTE,
        VALIDADE
      FROM TBOP
      WHERE COALESCE(DELETADO, 'N') = 'N'
      ORDER BY OP_ID DESC
      ROWS ? TO ?
    `,
    [startRow, endRow],
  );

  return {
    data: rows.map(formatOpCadastrada),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
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

async function getConfiguracaoAdministrativa() {
  const contexto = await getContextoEstacao();

  return {
    ...contexto,
    firebird: await getConfiguracaoFirebirdAtual(),
  };
}

async function getConfiguracaoAdministrativaSemConsultaBanco() {
  const configuracao = await getConfiguracaoAtual();

  return {
    ...configuracao,
    opAtiva: null,
    firebird: await getConfiguracaoFirebirdAtual(),
  };
}

async function testarOpAtiva(linhaProducaoId) {
  const linha = parseRequiredLinha(linhaProducaoId);
  const linhaProducao = formatLinhaProducao(await validarLinhaProducao(linha));

  return {
    linhaProducaoId: linhaProducao.linhaProducaoId,
    linhaProducao: linhaProducao.linhaProducao,
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

  return getConfiguracaoAdministrativa();
}

async function salvarConfiguracaoFirebird(data, audit) {
  const payload = data || {};
  const fileValues = await readEnvValues();
  const anterior = formatFirebirdConfig(fileValues);
  const novaConfiguracao = parseFirebirdPayload(payload);
  const senhaAlterada = hasPasswordInput(payload);
  const senhaFinal = senhaAlterada
    ? String(payload.password)
    : await getFirebirdPasswordAtual(fileValues);

  if (!senhaFinal) {
    throw new HttpError(400, "Campo 'password' é obrigatório quando não há senha configurada.", {
      code: 'REQUISICAO_INVALIDA',
    });
  }

  let cryptoKey = getEnvValue(fileValues, CRYPTO_KEY) || generateCryptoKey();
  let encryptedPassword;

  try {
    encryptedPassword = encryptSecret(senhaFinal, cryptoKey);
  } catch (erro) {
    cryptoKey = generateCryptoKey();
    encryptedPassword = encryptSecret(senhaFinal, cryptoKey);
  }
  const envValues = {
    [FIREBIRD_KEYS.host]: novaConfiguracao.host,
    [FIREBIRD_KEYS.port]: novaConfiguracao.port,
    [FIREBIRD_KEYS.database]: novaConfiguracao.database,
    [FIREBIRD_KEYS.user]: novaConfiguracao.user,
    [FIREBIRD_KEYS.password]: encryptedPassword,
    [FIREBIRD_KEYS.role]: novaConfiguracao.role,
    [FIREBIRD_KEYS.charset]: novaConfiguracao.charset,
    [FIREBIRD_KEYS.pageSize]: novaConfiguracao.pageSize,
    [FIREBIRD_KEYS.poolMax]: novaConfiguracao.poolMax,
    [FIREBIRD_KEYS.connectTimeoutMs]: novaConfiguracao.connectTimeoutMs,
    [CRYPTO_KEY]: cryptoKey,
  };

  await writeFirebirdEnv(envValues);

  const novaConfiguracaoResposta = formatFirebirdConfig({
    ...fileValues,
    ...Object.fromEntries(Object.entries(envValues).map(([key, value]) => [key, String(value)])),
  });

  await auditService.registerAccessEvent({
    usuarioId: audit.usuarioId,
    usuarioNome: audit.usuarioNome,
    local: 'CONFIG_ESTACAO',
    tipo: 'CONFIG_FIREBIRD_UPDATE',
    atividade: buildFirebirdAudit(anterior, novaConfiguracaoResposta, senhaAlterada),
    online: 'S',
    ip: audit.ip,
    computador: audit.computador,
    chaveId: null,
  });

  refreshFirebirdEnv();
  await database.closePool();

  return getConfiguracaoAdministrativaSemConsultaBanco();
}

module.exports = {
  CRYPTO_KEY,
  ESTACAO_KEY,
  FIREBIRD_KEYS,
  LINHA_KEY,
  getConfiguracaoAdministrativa,
  getConfiguracaoAtual,
  getConfiguracaoFirebirdAtual,
  getContextoEstacao,
  getLinhaProducaoIdOperacional,
  getLinhaProducaoIdConfigurada,
  listarLinhasProducao,
  listarOpsCadastradas,
  requireLinhaProducaoConfigurada,
  salvarConfiguracao,
  salvarConfiguracaoFirebird,
  testarOpAtiva,
  validarLinhaProducao,
};
