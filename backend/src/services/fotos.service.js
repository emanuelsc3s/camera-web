const fs = require('fs/promises');
const path = require('path');

const { env } = require('../config/env');
const { badRequest, notFound } = require('../utils/http-error');

const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png);base64,([a-z0-9+/=\r\n]+)$/i;
const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getUploadRoot() {
  if (path.isAbsolute(env.uploadDir)) {
    return env.uploadDir;
  }

  return path.resolve(env.rootDir, env.uploadDir);
}

function normalizeImageExtension(type) {
  return type.toLowerCase() === 'png' ? 'png' : 'jpg';
}

function parseDataUrl(fotoBase64) {
  const text = String(fotoBase64 || '').trim();
  const match = text.match(DATA_URL_PATTERN);

  if (!match) {
    throw badRequest("Campo 'fotoBase64' deve ser uma imagem JPEG ou PNG em Data URL.");
  }

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');

  if (!buffer.length) {
    throw badRequest("Campo 'fotoBase64' não contém imagem válida.");
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw badRequest("Campo 'fotoBase64' deve ter no máximo 5 MB.");
  }

  return {
    buffer,
    extension: normalizeImageExtension(match[1]),
  };
}

function getDateParts(date = new Date()) {
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

async function saveInspectionPhoto({ id, fotoBase64, date = new Date() }) {
  const { buffer, extension } = parseDataUrl(fotoBase64);
  const { year, month, day } = getDateParts(date);
  const filename = `${id}_${Date.now()}.${extension}`;
  const relativePath = path.posix.join(year, month, day, filename);
  const directory = path.join(getUploadRoot(), year, month, day);
  const fullPath = path.join(directory, filename);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(fullPath, buffer);

  return {
    relativePath,
    fullPath,
  };
}

async function removeFileIfExists(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (erro) {
    if (erro.code !== 'ENOENT') {
      throw erro;
    }
  }
}

function validatePhotoPathSegments({ year, month, day, filename }) {
  const values = [year, month, day, filename];

  if (values.some((value) => !SAFE_SEGMENT_PATTERN.test(String(value || '')))) {
    throw badRequest('Caminho da foto é inválido.');
  }

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    throw badRequest('Data da foto é inválida.');
  }
}

async function resolveInspectionPhotoPath({ year, month, day, filename }) {
  validatePhotoPathSegments({ year, month, day, filename });

  const uploadRoot = getUploadRoot();
  const fullPath = path.resolve(uploadRoot, year, month, day, filename);
  const relativeToRoot = path.relative(uploadRoot, fullPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw badRequest('Caminho da foto é inválido.');
  }

  try {
    await fs.access(fullPath);
  } catch (erro) {
    if (erro.code === 'ENOENT') {
      throw notFound('Foto não encontrada');
    }

    throw erro;
  }

  return fullPath;
}

module.exports = {
  removeFileIfExists,
  resolveInspectionPhotoPath,
  saveInspectionPhoto,
};
