const inspecoesService = require('../services/inspecoes.service');
const configuracaoEstacaoService = require('../services/configuracao-estacao.service');
const produtosService = require('../services/produtos.service');
const { HttpError, badRequest, notFound } = require('../utils/http-error');
const { formatDateTime, formatValidade, normalizeText } = require('../utils/formatters');
const { parsePagination } = require('../utils/pagination');

const FASE_INSPECAO_MANUAL = 'Fase 1';

function parseId(value, fieldName = 'id') {
  const text = String(value || '').trim();

  if (!/^\d+$/.test(text)) {
    throw badRequest(`Campo '${fieldName}' deve ser um número inteiro positivo.`);
  }

  const id = Number.parseInt(text, 10);

  if (id < 1) {
    throw badRequest(`Campo '${fieldName}' deve ser maior ou igual a 1.`);
  }

  return id;
}

function parseOptionalInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseId(value, fieldName);
}

function requireObject(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(`Campo '${fieldName}' deve ser um objeto.`);
  }

  return value;
}

function requireString(value, fieldName, maxLength) {
  const text = String(value || '').trim();

  if (!text) {
    throw badRequest(`Campo '${fieldName}' é obrigatório.`);
  }

  if (maxLength && text.length > maxLength) {
    throw badRequest(`Campo '${fieldName}' deve ter no máximo ${maxLength} caracteres.`);
  }

  return text;
}

function optionalString(value, fieldName, maxLength) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const text = String(value).trim();

  if (maxLength && text.length > maxLength) {
    throw badRequest(`Campo '${fieldName}' deve ter no máximo ${maxLength} caracteres.`);
  }

  return text || null;
}

function parseConformity(value, fieldName) {
  if (value === null || value === undefined) {
    throw badRequest(`Campo '${fieldName}' é obrigatório e deve estar aprovado ou reprovado.`);
  }

  if (value === true || value === 'Sim') {
    return 'Sim';
  }

  if (value === false || value === 'Não' || value === 'Nao') {
    return 'Não';
  }

  throw badRequest(`Campo '${fieldName}' deve ser true, false, 'Sim' ou 'Não'.`);
}

function conformidadeToBoolean(value) {
  if (value === 'Sim') {
    return true;
  }

  if (value === 'Não') {
    return false;
  }

  return null;
}

function parseValidade(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = String(value).trim();
  const monthYear = text.match(/^(\d{2})\/(\d{4})$/);

  if (monthYear) {
    return new Date(Number(monthYear[2]), Number(monthYear[1]) - 1, 1);
  }

  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (brDate) {
    return new Date(Number(brDate[3]), Number(brDate[2]) - 1, Number(brDate[1]));
  }

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  }

  throw badRequest("Campo 'referenceData.validade' deve estar em formato MM/AAAA, DD/MM/AAAA ou ISO.");
}

async function parseCreatePayload(body) {
  const inspectionStates = requireObject(body.inspectionStates, 'inspectionStates');
  const opAtivaIdConfirmado = parseId(body.opAtivaIdConfirmado, 'opAtivaIdConfirmado');
  const linhaProducaoId = await configuracaoEstacaoService.getLinhaProducaoIdOperacional();
  const produtoReferencia = await produtosService.getOpAtivaPorLinha(linhaProducaoId);

  if (!produtoReferencia) {
    throw new HttpError(409, 'Não existe OP ativa para a linha de produção configurada.', {
      code: 'SEM_OP_ATIVA',
    });
  }

  if (Number(produtoReferencia.OP_ID) !== opAtivaIdConfirmado) {
    throw new HttpError(409, 'A OP ativa foi alterada. Recarregue a tela e confira os dados antes de salvar.', {
      code: 'OP_ATIVA_ALTERADA',
      details: {
        opAtivaAtual: produtoReferencia.OP,
        opAtivaIdAtual: produtoReferencia.OP_ID,
      },
    });
  }

  return {
    fotoBase64: requireString(body.fotoBase64, 'fotoBase64'),
    referenceData: {
      op: requireString(produtoReferencia.OP, 'opAtiva.op', 10),
      erpProduto: normalizeText(produtoReferencia.ERP_PRODUTO),
      lote: normalizeText(produtoReferencia.LOTE),
      validade: produtoReferencia.VALIDADE,
      produto: normalizeText(produtoReferencia.PRODUTO),
      registroAnvisa: normalizeText(produtoReferencia.REGISTRO_ANVISA),
      gtin: normalizeText(produtoReferencia.GTIN),
    },
    validadeDate: parseValidade(produtoReferencia.VALIDADE),
    opId: produtoReferencia.OP_ID,
    linhaProducaoId,
    fase: FASE_INSPECAO_MANUAL,
    conformidades: {
      gtin: parseConformity(inspectionStates.gtin, 'inspectionStates.gtin'),
      datamatrix: parseConformity(inspectionStates.datamatrix, 'inspectionStates.datamatrix'),
      lote: parseConformity(inspectionStates.lote, 'inspectionStates.lote'),
      validade: parseConformity(inspectionStates.validade, 'inspectionStates.validade'),
    },
    observacoes: optionalString(body.observacoes, 'observacoes', 1000),
    usuarioId: parseOptionalInteger(body.usuarioId, 'usuarioId'),
    usuario: optionalString(body.usuario, 'usuario', 30),
    localizacao: optionalString(body.localizacao, 'localizacao', 200),
  };
}

function parseAuditPayload(body = {}) {
  return {
    usuarioId: parseOptionalInteger(body.usuarioId, 'usuarioId'),
    usuario: optionalString(body.usuario, 'usuario', 30),
  };
}

function buildPhotoUrl(relativePath) {
  const text = normalizeText(relativePath);

  if (!text) {
    return null;
  }

  return `/api/fotos/${text.replace(/\\/g, '/')}`;
}

function mapStatusFinal(status) {
  if (status === 'Aprovado') {
    return 'APROVADO';
  }

  if (status === 'Rejeitado') {
    return 'REPROVADO';
  }

  return 'ABERTO';
}

function formatInspection(row) {
  const timestamp = row.DATA instanceof Date ? row.DATA.getTime() : new Date(row.DATA).getTime();

  return {
    id: String(row.INSPECAOMANUAL_ID),
    timestamp: Number.isNaN(timestamp) ? null : timestamp,
    dataHora: formatDateTime(row.DATA),
    foto: buildPhotoUrl(row.CAMINHO_FOTO),
    referenceData: {
      op: normalizeText(row.OP),
      lote: normalizeText(row.LOTE),
      validade: formatValidade(row.VALIDADE),
      produto: normalizeText(row.PRODUTO),
      registroAnvisa: normalizeText(row.REGISTRO_ANVISA),
      gtin: normalizeText(row.GTIN),
    },
    inspectionStates: {
      gtin: conformidadeToBoolean(row.GTIN_CONFORME),
      datamatrix: conformidadeToBoolean(row.DATAMATRIX_CONFORME),
      lote: conformidadeToBoolean(row.LOTE_CONFORME),
      validade: conformidadeToBoolean(row.VALIDADE_CONFORME),
    },
    linhaProducaoId: row.LINHAPRODUCAO_ID ?? null,
    fase: normalizeText(row.FASE) || null,
    status: normalizeText(row.STATUS),
    statusFinal: mapStatusFinal(row.STATUS),
    auditoria: {
      criadoEm: row.DATA_INC || null,
      criadoPorId: row.USUARIO_I ?? null,
      criadoPorNome: normalizeText(row.USUARIONOME_I) || null,
      alteradoEm: row.DATA_ALT || null,
      alteradoPorId: row.USUARIO_A ?? null,
      alteradoPorNome: normalizeText(row.USUARIONOME_A) || null,
      excluidoEm: row.DATA_DEL || null,
      excluidoPorId: row.USUARIO_D ?? null,
      excluidoPorNome: normalizeText(row.USUARIONOME_D) || null,
    },
    observacoes: normalizeText(row.OBSERVACOES) || null,
    usuario: normalizeText(row.USUARIO) || null,
    localizacao: normalizeText(row.LOCALIZACAO) || null,
  };
}

async function create(req, res, next) {
  try {
    const payload = await parseCreatePayload(req.body);
    const result = await inspecoesService.createInspection(payload);

    res.status(201).json({
      id: result.id,
      status: result.status,
      message: 'Inspeção criada com sucesso',
    });
  } catch (erro) {
    next(erro);
  }
}

async function list(req, res, next) {
  try {
    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
    });

    const result = await inspecoesService.listInspections({
      ...pagination,
      campo: req.query.campo,
      termo: req.query.termo,
    });

    res.json({
      data: result.rows.map(formatInspection),
      total: result.total,
      page: pagination.page,
      pageSize: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    });
  } catch (erro) {
    next(erro);
  }
}

async function summary(req, res, next) {
  try {
    const linhaProducaoId = parseOptionalInteger(req.query.linhaProducaoId, 'linhaProducaoId');

    if (!linhaProducaoId) {
      throw badRequest("Parâmetro 'linhaProducaoId' é obrigatório.");
    }

    res.json(await inspecoesService.getInspectionSummary(linhaProducaoId));
  } catch (erro) {
    next(erro);
  }
}

async function getById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await inspecoesService.getInspectionById(id);

    if (!row) {
      throw notFound('Inspeção não encontrada');
    }

    res.json(formatInspection(row));
  } catch (erro) {
    next(erro);
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const deleted = await inspecoesService.deleteInspection(id, parseAuditPayload(req.body));

    if (!deleted) {
      throw notFound('Inspeção não encontrada');
    }

    res.json({
      message: 'Inspeção excluída logicamente com sucesso',
    });
  } catch (erro) {
    next(erro);
  }
}

async function removeBatch(req, res, next) {
  try {
    const ids = Array.isArray(req.body.ids)
      ? req.body.ids
        .map((id) => parseId(id, 'ids'))
        .filter((id, index, array) => array.indexOf(id) === index)
      : null;

    if (!ids || !ids.length) {
      throw badRequest("Campo 'ids' deve conter ao menos um ID.");
    }

    if (ids.length > 100) {
      throw badRequest("Campo 'ids' deve conter no máximo 100 IDs por requisição.");
    }

    const deletedCount = await inspecoesService.deleteManyInspections(ids, parseAuditPayload(req.body));

    res.json({
      message: `${deletedCount} inspeção(ões) excluída(s) logicamente com sucesso`,
      deletedCount,
    });
  } catch (erro) {
    next(erro);
  }
}

async function exportJson(req, res, next) {
  try {
    const rows = await inspecoesService.exportInspections();
    const filename = `inspecoes_${Date.now()}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(rows.map(formatInspection));
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  create,
  exportJson,
  getById,
  list,
  remove,
  removeBatch,
  summary,
};
