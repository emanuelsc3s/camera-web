const express = require('express');

const produtosController = require('../controllers/produtos.controller');

const router = express.Router();

router.get('/', produtosController.list);
router.get('/gtin/:gtin', produtosController.getByGTIN);
router.get('/:op', produtosController.getByOP);

module.exports = router;
