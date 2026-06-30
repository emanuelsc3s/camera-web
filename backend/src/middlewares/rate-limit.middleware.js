const { MemoryStore, rateLimit } = require('express-rate-limit');

const { tooManyRequests } = require('../utils/http-error');

const stores = [];

function getClientIp(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'desconhecido';
}

function createRateLimiter(options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyPrefix = options.keyPrefix || 'global';
  const message = options.message || 'Muitas requisições. Tente novamente mais tarde.';
  const store = new MemoryStore();

  stores.push(store);

  return rateLimit({
    windowMs,
    limit: max,
    store,
    standardHeaders: false,
    legacyHeaders: false,
    validate: false,
    keyGenerator: (req) => `${keyPrefix}:${getClientIp(req)}`,
    handler: (req, res, next) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryMs = resetTime instanceof Date
        ? Math.max(resetTime.getTime() - Date.now(), 0)
        : windowMs;

      next(tooManyRequests(message, {
        limite: max,
        janelaMs: windowMs,
        tenteNovamenteEmMs: retryMs,
      }));
    },
  });
}

function resetRateLimiters() {
  stores.forEach((store) => {
    if (typeof store.resetAll === 'function') {
      store.resetAll();
    }
  });
}

module.exports = {
  createRateLimiter,
  resetRateLimiters,
};
