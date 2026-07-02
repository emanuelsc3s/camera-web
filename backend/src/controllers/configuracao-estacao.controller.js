const configuracaoEstacaoService = require('../services/configuracao-estacao.service');
const { parsePagination } = require('../utils/pagination');

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

async function get(req, res, next) {
  try {
    res.json(await configuracaoEstacaoService.getConfiguracaoAdministrativa());
  } catch (erro) {
    next(erro);
  }
}

async function getFirebird(req, res, next) {
  try {
    res.json(await configuracaoEstacaoService.getConfiguracaoFirebirdAtual());
  } catch (erro) {
    next(erro);
  }
}

async function update(req, res, next) {
  try {
    const context = getRequestContext(req);
    const result = await configuracaoEstacaoService.salvarConfiguracao(req.body || {}, {
      usuarioId: req.authUser?.usuarioId,
      usuarioNome: req.authUser?.nome,
      ip: context.ip,
      computador: context.computador,
    });

    res.json(result);
  } catch (erro) {
    next(erro);
  }
}

async function updateFirebird(req, res, next) {
  try {
    const context = getRequestContext(req);
    const result = await configuracaoEstacaoService.salvarConfiguracaoFirebird(req.body || {}, {
      usuarioId: req.authUser?.usuarioId,
      usuarioNome: req.authUser?.nome,
      ip: context.ip,
      computador: context.computador,
    });

    res.json(result);
  } catch (erro) {
    next(erro);
  }
}

async function testOpAtiva(req, res, next) {
  try {
    res.json(await configuracaoEstacaoService.testarOpAtiva(req.query.linhaProducaoId));
  } catch (erro) {
    next(erro);
  }
}

async function listOpsCadastradas(req, res, next) {
  try {
    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 50,
    });

    res.json(await configuracaoEstacaoService.listarOpsCadastradas(pagination));
  } catch (erro) {
    next(erro);
  }
}

async function listLinhasProducao(req, res, next) {
  try {
    const pagination = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 50,
    });

    res.json(await configuracaoEstacaoService.listarLinhasProducao(pagination));
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  get,
  getFirebird,
  listLinhasProducao,
  listOpsCadastradas,
  testOpAtiva,
  update,
  updateFirebird,
};
