const authService = require('../services/auth.service');
const { badRequest } = require('../utils/http-error');

function requireObject(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest(`Campo '${fieldName}' deve ser um objeto.`);
  }

  return value;
}

function optionalString(value, fieldName, maxLength) {
  if (value === undefined || value === null) {
    return '';
  }

  const text = String(value).trim();

  if (maxLength && text.length > maxLength) {
    throw badRequest(`Campo '${fieldName}' deve ter no máximo ${maxLength} caracteres.`);
  }

  return text;
}

function getRequestContext(req) {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const computador = req.headers['x-terminal-id'] ||
    req.headers['x-computer-name'] ||
    req.headers['user-agent'] ||
    null;

  return {
    ip: forwardedFor || req.ip || req.socket?.remoteAddress || null,
    computador,
  };
}

function parseLoginPayload(body) {
  const payload = requireObject(body, 'body');

  return {
    username: optionalString(payload.username ?? payload.usuario, 'username', 255),
    password: optionalString(payload.password ?? payload.senha, 'password', 128),
  };
}

function parseChangeExpiredPasswordPayload(body) {
  const payload = requireObject(body, 'body');

  return {
    changeToken: optionalString(payload.changeToken, 'changeToken', 4096),
    newPassword: optionalString(payload.newPassword, 'newPassword', 128),
    confirmPassword: optionalString(payload.confirmPassword, 'confirmPassword', 128),
  };
}

async function login(req, res, next) {
  try {
    const payload = parseLoginPayload(req.body);
    const result = await authService.login(payload, getRequestContext(req));

    if (result.passwordExpired) {
      res.status(403).json({
        success: false,
        error: result.message,
        code: 'SENHA_EXPIRADA',
        changeToken: result.changeToken,
        user: result.user,
      });
      return;
    }

    res.json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (erro) {
    next(erro);
  }
}

async function changeExpiredPassword(req, res, next) {
  try {
    const payload = parseChangeExpiredPasswordPayload(req.body);
    const result = await authService.changeExpiredPassword(payload, getRequestContext(req));

    res.json({
      success: true,
      message: 'Senha alterada com sucesso. Entre novamente usando a nova senha.',
      data: {
        user: result.user,
        expiresAt: result.expiresAt,
      },
    });
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  changeExpiredPassword,
  login,
};
