const { badRequest } = require('./http-error');

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim();
  if (!/^\d+$/.test(normalized)) {
    throw badRequest(`Parâmetro '${fieldName}' deve ser um número inteiro positivo.`);
  }

  const parsed = Number.parseInt(normalized, 10);
  if (parsed < 1) {
    throw badRequest(`Parâmetro '${fieldName}' deve ser maior ou igual a 1.`);
  }

  return parsed;
}

function parsePagination(query, options = {}) {
  const defaultPage = options.defaultPage || 1;
  const defaultLimit = options.defaultLimit || 50;
  const maxLimit = options.maxLimit || 100;

  const page = parsePositiveInteger(query.page, 'page', defaultPage);
  const limit = parsePositiveInteger(query.limit, 'limit', defaultLimit);

  if (limit > maxLimit) {
    throw badRequest(`Parâmetro 'limit' deve ser menor ou igual a ${maxLimit}.`);
  }

  const startRow = (page - 1) * limit + 1;
  const endRow = startRow + limit - 1;

  return {
    page,
    limit,
    startRow,
    endRow,
  };
}

module.exports = {
  parsePagination,
};
