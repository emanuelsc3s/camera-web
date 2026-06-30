const express = require('express');

const faceIdController = require('../controllers/faceId.controller');
const { createRateLimiter } = require('../middlewares/rate-limit.middleware');

const router = express.Router();

const authenticateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyPrefix: 'face-id-auth',
  message: 'Muitas tentativas de autenticação facial. Aguarde antes de tentar novamente.',
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyPrefix: 'face-id-register',
  message: 'Muitos cadastros de Face ID neste terminal. Aguarde antes de tentar novamente.',
});

const maintenanceLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyPrefix: 'face-id-maintenance',
  message: 'Muitas alterações de Face ID neste terminal. Aguarde antes de tentar novamente.',
});

router.post('/register', registerLimiter, faceIdController.register);
router.post('/authenticate', authenticateLimiter, faceIdController.authenticate);
router.get('/users', faceIdController.listUsers);
router.get('/users/:id/access-history', faceIdController.getAccessHistory);
router.get('/users/:id', faceIdController.getUserById);
router.put('/users/:id', maintenanceLimiter, faceIdController.updateUser);
router.delete('/users/:id', maintenanceLimiter, faceIdController.deleteUser);

module.exports = router;
