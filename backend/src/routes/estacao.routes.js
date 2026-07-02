const express = require('express');

const estacaoController = require('../controllers/estacao.controller');

const router = express.Router();

router.get('/contexto', estacaoController.getContexto);

module.exports = router;
