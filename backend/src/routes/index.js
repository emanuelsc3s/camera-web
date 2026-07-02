const express = require('express');

const authRoutes = require('./auth.routes');
const configuracaoEstacaoRoutes = require('./configuracao-estacao.routes');
const estacaoRoutes = require('./estacao.routes');
const healthRoutes = require('./health.routes');
const faceIdRoutes = require('./faceId.routes');
const fotosRoutes = require('./fotos.routes');
const inspecoesRoutes = require('./inspecoes.routes');
const produtosRoutes = require('./produtos.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/configuracao-estacao', configuracaoEstacaoRoutes);
router.use('/estacao', estacaoRoutes);
router.use('/health', healthRoutes);
router.use('/face-id', faceIdRoutes);
router.use('/fotos', fotosRoutes);
router.use('/inspecoes', inspecoesRoutes);
router.use('/produtos', produtosRoutes);

module.exports = router;
