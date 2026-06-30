const express = require('express');

const fotosController = require('../controllers/fotos.controller');

const router = express.Router();

router.get('/:year/:month/:day/:filename', fotosController.getInspectionPhoto);

module.exports = router;
