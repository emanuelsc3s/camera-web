function errorMiddleware(erro, req, res, next) {
  const status = erro.status || erro.statusCode || 500;
  const expose = erro.expose === true || status < 500;
  const payload = {
    success: false,
    error: expose ? erro.message : 'Erro interno do servidor.',
  };

  if (erro.code) {
    payload.code = erro.code;
  }

  if (erro.details) {
    payload.details = erro.details;
  }

  if (status >= 500 && process.env.NODE_ENV === 'development' && erro.stack) {
    payload.stack = erro.stack;
  }

  if (status >= 500) {
    console.error('Erro interno na API:', erro);
  }

  res.status(status).json(payload);
}

module.exports = errorMiddleware;
