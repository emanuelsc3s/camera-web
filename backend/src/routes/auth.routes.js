const express = require('express');

const authController = require('../controllers/auth.controller');
const { createRateLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'auth-login',
  message: 'Muitas tentativas de login. Aguarde antes de tentar novamente.',
});

const changePasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'auth-change-password',
  message: 'Muitas tentativas de alteração de senha. Aguarde antes de tentar novamente.',
});

router.post('/login', loginLimiter, authController.login);
router.post('/change-expired-password', changePasswordLimiter, authController.changeExpiredPassword);

module.exports = router;
