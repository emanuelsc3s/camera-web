const database = require('../config/database');
const { env } = require('../config/env');

async function health(req, res, next) {
  try {
    const firebird = await database.ping();
    const httpStatus = firebird.ok ? 200 : 503;

    res.status(httpStatus).json({
      status: firebird.ok ? 'ok' : 'degradado',
      api: {
        nome: 'Camera Web Backend',
        ambiente: env.nodeEnv,
        uptimeSeconds: Math.round(process.uptime()),
      },
      firebird: {
        status: firebird.ok ? 'ok' : 'erro',
        latencyMs: Number(firebird.latencyMs.toFixed(2)),
        error: firebird.ok ? null : firebird.error,
      },
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  health,
};
