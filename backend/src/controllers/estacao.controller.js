const configuracaoEstacaoService = require('../services/configuracao-estacao.service');

async function getContexto(req, res, next) {
  try {
    const contexto = await configuracaoEstacaoService.getContextoEstacao();

    if (!contexto.configurado) {
      configuracaoEstacaoService.requireLinhaProducaoConfigurada();
    }

    res.json(contexto);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  getContexto,
};
