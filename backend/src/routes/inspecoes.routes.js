const express = require('express');

const inspecoesController = require('../controllers/inspecoes.controller');

const router = express.Router();

router.post('/', inspecoesController.create);
router.get('/', inspecoesController.list);
router.get('/export/json', inspecoesController.exportJson);
router.delete('/batch', inspecoesController.removeBatch);
router.get('/:id', inspecoesController.getById);
router.delete('/:id', inspecoesController.remove);

module.exports = router;
