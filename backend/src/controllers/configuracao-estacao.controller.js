const configuracaoEstacaoService = require('../services/configuracao-estacao.service');

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
    res.json(await configuracaoEstacaoService.getContextoEstacao());
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

async function testOpAtiva(req, res, next) {
  try {
    res.json(await configuracaoEstacaoService.testarOpAtiva(req.query.linhaProducaoId));
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  get,
  testOpAtiva,
  update,
};
