function errorMiddleware(erro, req, res, next) {
  const status = erro.status || erro.statusCode || 500;

  if (status >= 500) {
    console.error('Erro interno na API:', erro);
  }

  res.status(status).json({
    error: {
      code: erro.code || 'ERRO_INTERNO',
      message: status >= 500 ? 'Erro interno do servidor.' : erro.message,
    },
  });
}

module.exports = errorMiddleware;
