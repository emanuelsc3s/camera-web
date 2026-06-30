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

function notFound(message) {
  return new HttpError(404, message, {
    code: 'NAO_ENCONTRADO',
  });
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
};
