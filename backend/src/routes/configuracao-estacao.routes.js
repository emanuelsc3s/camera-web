const express = require('express');

const configuracaoEstacaoController = require('../controllers/configuracao-estacao.controller');
const { requireAdministrador } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAdministrador);

router.get('/teste-op-ativa', configuracaoEstacaoController.testOpAtiva);
router.get('/', configuracaoEstacaoController.get);
router.put('/', configuracaoEstacaoController.update);

module.exports = router;
