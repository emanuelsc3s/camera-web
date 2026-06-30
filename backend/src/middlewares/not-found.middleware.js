function notFoundMiddleware(req, res) {
  res.status(404).json({
    error: {
      code: 'ROTA_NAO_ENCONTRADA',
      message: `Rota nao encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}

module.exports = notFoundMiddleware;
