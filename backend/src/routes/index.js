const express = require('express');

const healthRoutes = require('./health.routes');
const produtosRoutes = require('./produtos.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/produtos', produtosRoutes);

module.exports = router;
