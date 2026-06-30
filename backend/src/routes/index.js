const express = require('express');

const healthRoutes = require('./health.routes');
const fotosRoutes = require('./fotos.routes');
const inspecoesRoutes = require('./inspecoes.routes');
const produtosRoutes = require('./produtos.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/fotos', fotosRoutes);
router.use('/inspecoes', inspecoesRoutes);
router.use('/produtos', produtosRoutes);

module.exports = router;
