const produtosService = require('../services/produtos.service');
const { formatProductReference } = require('../utils/formatters');
const { badRequest, notFound } = require('../utils/http-error');
const { parsePagination } = require('../utils/pagination');

function validateOP(value) {
  const op = String(value || '').trim();

  if (!op) {
    throw badRequest("Parâmetro 'op' é obrigatório.");
  }

  if (op.length > 10) {
    throw badRequest("Parâmetro 'op' deve ter no máximo 10 caracteres.");
  }

  return op;
}

function validateGTIN(value) {
  const gtin = String(value || '').trim();

  if (!gtin) {
    throw badRequest("Parâmetro 'gtin' é obrigatório.");
  }

  if (!/^\d{8,20}$/.test(gtin)) {
    throw badRequest("Parâmetro 'gtin' deve conter apenas números e ter entre 8 e 20 dígitos.");
  }

  return gtin;
}

async function getByOP(req, res, next) {
  try {
    const op = validateOP(req.params.op);
    const produto = await produtosService.getProductByOP(op);

    if (!produto) {
      throw notFound('Produto não encontrado');
    }

    res.json(formatProductReference(produto));
  } catch (erro) {
    next(erro);
  }
}

async function getByGTIN(req, res, next) {
  try {
    const gtin = validateGTIN(req.params.gtin);
    const produto = await produtosService.getProductByGTIN(gtin);

    if (!produto) {
      throw notFound('Produto não encontrado');
    }

    res.json(formatProductReference(produto));
  } catch (erro) {
    next(erro);
  }
}

async function list(req, res, next) {
  try {
    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 50,
      maxLimit: 100,
    });

    const produtos = await produtosService.getAllProducts(pagination);
    res.json(produtos);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  getByGTIN,
  getByOP,
  list,
};
