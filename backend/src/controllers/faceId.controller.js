const { z } = require('zod');

const faceIdService = require('../services/faceId.service');
const { badRequest, notFound } = require('../utils/http-error');
const { parsePagination } = require('../utils/pagination');
const vectorMath = require('../utils/vectorMath');

const descriptorSchema = z
  .array(z.number().finite())
  .length(vectorMath.DESCRIPTOR_LENGTH);
const thresholdSchema = z
  .coerce
  .number()
  .finite()
  .gt(0)
  .lte(1);

const FORBIDDEN_IMAGE_FIELD_PATTERNS = [
  /foto/i,
  /photo/i,
  /imagem/i,
  /image/i,
  /picture/i,
  /base64/i,
];

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

function findForbiddenImageFields(value, path = 'body', found = []) {
  if (!value || typeof value !== 'object') {
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item && typeof item === 'object') {
        findForbiddenImageFields(item, `${path}[${index}]`, found);
      }
    });
    return found;
  }

  Object.keys(value).forEach((key) => {
    const currentPath = `${path}.${key}`;

    if (FORBIDDEN_IMAGE_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      found.push(currentPath);
    }

    findForbiddenImageFields(value[key], currentPath, found);
  });

  return found;
}

function rejectImagePayload(body) {
  const forbiddenFields = findForbiddenImageFields(body);

  if (forbiddenFields.length) {
    throw badRequest(
      'Payload de Face ID não deve conter foto, imagem, URL de foto ou base64. Envie somente descriptor facial.',
      { campos: forbiddenFields },
    );
  }
}

function parseDescriptor(value, fieldName = 'descriptor') {
  const result = descriptorSchema.safeParse(value);

  if (!result.success) {
    throw badRequest(
      `Campo '${fieldName}' deve conter exatamente ${vectorMath.DESCRIPTOR_LENGTH} números válidos.`,
      { issues: result.error.issues.map((issue) => issue.message) },
    );
  }

  return result.data;
}

function parseThreshold(value) {
  if (value === undefined || value === null || value === '') {
    return faceIdService.DEFAULT_THRESHOLD;
  }

  const result = thresholdSchema.safeParse(value);

  if (!result.success) {
    throw badRequest(
      "Campo 'threshold' deve ser um número maior que 0 e menor ou igual a 1.",
      { issues: result.error.issues.map((issue) => issue.message) },
    );
  }

  return result.data;
}

function parseDate(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw badRequest(`Parâmetro '${fieldName}' deve ser uma data ISO 8601 válida.`);
  }

  return date;
}

function getRequestContext(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const computador = req.headers['x-terminal-id'] ||
    req.headers['x-computer-name'] ||
    req.headers['user-agent'] ||
    null;

  return {
    ip: forwardedFor || req.ip || req.socket?.remoteAddress || null,
    computador,
  };
}

function parseAuditPayload(body = {}, fallback = {}) {
  return {
    auditUsuarioId: parseOptionalInteger(
      body.auditUsuarioId ?? body.usuarioI ?? fallback.usuarioId,
      'auditUsuarioId',
    ),
    auditUsuarioNome: optionalString(
      body.auditUsuarioNome ?? body.usuarioNome ?? body.usuario ?? fallback.name,
      'auditUsuarioNome',
      30,
    ),
  };
}

function parseRegisterPayload(body) {
  const payload = requireObject(body, 'body');
  rejectImagePayload(payload);

  const usuarioId = parseOptionalInteger(payload.usuarioId, 'usuarioId');
  const matricula = optionalString(payload.matricula, 'matricula', 30);

  if (!usuarioId && !matricula) {
    throw badRequest("Informe 'usuarioId' ou 'matricula' para rastrear o cadastro Face ID.");
  }

  const name = requireString(payload.name ?? payload.nome, 'name', 30);

  return {
    usuarioId,
    name,
    matricula,
    email: optionalString(payload.email, 'email', 120),
    descriptor: parseDescriptor(payload.descriptor),
    ...parseAuditPayload(payload, { usuarioId, name }),
  };
}

function parseAuthenticatePayload(body) {
  const payload = requireObject(body, 'body');
  rejectImagePayload(payload);

  return {
    descriptor: parseDescriptor(payload.descriptor),
    threshold: parseThreshold(payload.threshold),
    usuarioId: parseOptionalInteger(payload.usuarioId, 'usuarioId'),
    matricula: optionalString(payload.matricula, 'matricula', 30),
  };
}

function parseUpdatePayload(body) {
  const payload = requireObject(body, 'body');
  rejectImagePayload(payload);

  return {
    descriptor: parseDescriptor(payload.descriptor),
    ...parseAuditPayload(payload),
  };
}

function parseDeletePayload(body = {}) {
  const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  rejectImagePayload(payload);

  return parseAuditPayload(payload);
}

async function register(req, res, next) {
  try {
    const payload = parseRegisterPayload(req.body);
    const result = await faceIdService.registerFaceId(payload, getRequestContext(req));

    res.status(201).json({
      success: true,
      message: 'Face ID cadastrado com sucesso',
      data: result,
    });
  } catch (erro) {
    next(erro);
  }
}

async function authenticate(req, res, next) {
  try {
    const payload = parseAuthenticatePayload(req.body);
    const result = await faceIdService.authenticateFaceId(payload, getRequestContext(req));

    res.json({
      success: true,
      ...result,
    });
  } catch (erro) {
    next(erro);
  }
}

async function listUsers(req, res, next) {
  try {
    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 100,
    });
    const search = optionalString(req.query.search, 'search', 100);
    const result = await faceIdService.listFaceIdUsers({
      ...pagination,
      search,
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    });
  } catch (erro) {
    next(erro);
  }
}

async function getUserById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const result = await faceIdService.getFaceIdById(id);

    if (!result) {
      throw notFound('Usuário Face ID não encontrado');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (erro) {
    next(erro);
  }
}

async function updateUser(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const payload = parseUpdatePayload(req.body);
    const result = await faceIdService.updateFaceId(id, payload, getRequestContext(req));

    res.json({
      success: true,
      message: 'Face ID atualizado com sucesso',
      data: result,
    });
  } catch (erro) {
    next(erro);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const payload = parseDeletePayload(req.body);

    await faceIdService.deleteFaceId(id, payload, getRequestContext(req));

    res.json({
      success: true,
      message: 'Face ID removido com sucesso',
    });
  } catch (erro) {
    next(erro);
  }
}

async function getAccessHistory(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const existing = await faceIdService.getFaceIdById(id);

    if (!existing) {
      throw notFound('Usuário Face ID não encontrado');
    }

    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 20,
      maxLimit: 100,
    });
    const result = await faceIdService.getAccessHistory(id, {
      ...pagination,
      startDate: parseDate(req.query.startDate, 'startDate'),
      endDate: parseDate(req.query.endDate, 'endDate'),
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  authenticate,
  deleteUser,
  getAccessHistory,
  getUserById,
  listUsers,
  register,
  updateUser,
};
