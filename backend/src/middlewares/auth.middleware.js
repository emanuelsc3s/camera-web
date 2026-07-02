const database = require('../config/database');
const { env } = require('../config/env');
const { HttpError } = require('../utils/http-error');
const { verifyJwt } = require('../utils/jwt');

function unauthorized(message, details) {
  return new HttpError(401, message, {
    code: 'NAO_AUTENTICADO',
    details,
  });
}

function forbidden(message, details) {
  return new HttpError(403, message, {
    code: 'ACESSO_NEGADO',
    details,
  });
}

function normalizePerfil(value) {
  return String(value || '').trim().toUpperCase();
}

function extractBearerToken(req) {
  const authorization = String(req.headers.authorization || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function requireAuth(req, res, next) {
  try {
    if (!env.jwt.secret) {
      throw new HttpError(503, 'Configure JWT_SECRET no backend/.env antes de validar usuários.', {
        code: 'JWT_SECRET_NAO_CONFIGURADO',
      });
    }

    const token = extractBearerToken(req);
    if (!token) {
      throw unauthorized('Token de autenticação não informado.');
    }

    const payload = verifyJwt(token, env.jwt.secret);
    if (!payload) {
      throw unauthorized('Token de autenticação inválido.');
    }

    req.auth = payload;
    next();
  } catch (erro) {
    if (erro instanceof HttpError) {
      next(erro);
      return;
    }

    next(unauthorized('Token de autenticação inválido ou expirado.'));
  }
}

async function requireAdministrador(req, res, next) {
  try {
    const usuarioId = Number.parseInt(req.auth?.usuarioId || req.auth?.sub, 10);

    if (!Number.isInteger(usuarioId) || usuarioId < 1) {
      throw forbidden('Usuário autenticado sem vínculo válido com TBUSUARIO.');
    }

    const rows = await database.query(
      `
        SELECT FIRST 1 USUARIO_ID, NOME, PERFIL
        FROM TBUSUARIO
        WHERE USUARIO_ID = ?
          AND COALESCE(DELETADO, 'N') = 'N'
      `,
      [usuarioId],
    );

    const usuario = rows[0];
    if (!usuario || normalizePerfil(usuario.PERFIL) !== 'ADMINISTRADOR') {
      throw forbidden('Acesso permitido somente para usuários Administradores.');
    }

    req.authUser = {
      usuarioId: usuario.USUARIO_ID,
      nome: usuario.NOME,
      perfil: usuario.PERFIL,
    };

    next();
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  requireAdministrador: [requireAuth, requireAdministrador],
  requireAuth,
};
