const fotosService = require('../services/fotos.service');

async function getInspectionPhoto(req, res, next) {
  try {
    const fullPath = await fotosService.resolveInspectionPhotoPath({
      year: req.params.year,
      month: req.params.month,
      day: req.params.day,
      filename: req.params.filename,
    });

    res.sendFile(fullPath);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  getInspectionPhoto,
};
