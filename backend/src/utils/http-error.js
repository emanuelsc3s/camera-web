class HttpError extends Error {
  constructor(status, message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = options.code || null;
    this.details = options.details || null;
    this.expose = options.expose !== false;
  }
}

function badRequest(message, details) {
  return new HttpError(400, message, {
    code: 'REQUISICAO_INVALIDA',
    details,
  });
}

function conflict(message, details) {
  return new HttpError(409, message, {
    code: 'CONFLITO',
    details,
  });
}

function forbidden(message, details) {
  return new HttpError(403, message, {
    code: 'ACESSO_NEGADO',
    details,
  });
}

function notFound(message) {
  return new HttpError(404, message, {
    code: 'NAO_ENCONTRADO',
  });
}

function tooManyRequests(message, details) {
  return new HttpError(429, message, {
    code: 'MUITAS_REQUISICOES',
    details,
  });
}

module.exports = {
  HttpError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  tooManyRequests,
};
