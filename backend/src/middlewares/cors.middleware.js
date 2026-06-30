const cors = require('cors');

const { env } = require('../config/env');

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch (erro) {
    return false;
  }
}

module.exports = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.cors.origins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (env.cors.allowLocalhost && isLocalhostOrigin(origin)) {
      callback(null, true);
      return;
    }

    const erro = new Error(`Origem nao permitida pelo CORS: ${origin}`);
    erro.status = 403;
    erro.code = 'CORS_ORIGEM_NEGADA';
    callback(erro);
  },
  credentials: true,
});
