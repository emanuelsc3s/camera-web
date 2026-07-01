const crypto = require('crypto');

const database = require('../config/database');
const { env } = require('../config/env');
const auditService = require('./audit.service');
const { HttpError, badRequest, conflict } = require('../utils/http-error');
const { signJwt, verifyJwt } = require('../utils/jwt');

const MAX_LOGIN_FAILED_ATTEMPTS = 3;
const PASSWORD_CHANGE_PURPOSE = 'SENHA_EXPIRADA';
const PASSWORD_CHANGE_TOKEN_EXPIRES_IN = '15m';
const DEFAULT_PASSWORD_EXPIRATION_DAYS = 60;

function normalizeText(value) {
  return value === undefined || value === null ? null : String(value).trim() || null;
}

function hashPassword(usuarioId, password) {
  return crypto
    .createHash('md5')
    .update(`${usuarioId}${String(password || '').trim()}`, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function assertJwtConfigured() {
  if (!env.jwt.secret) {
    throw new HttpError(503, 'Configure JWT_SECRET no backend/.env antes de autenticar usuários.', {
      code: 'JWT_SECRET_NAO_CONFIGURADO',
    });
  }
}

function buildSessionToken(user) {
  assertJwtConfigured();

  return signJwt(
    {
      sub: String(user.USUARIO_ID),
      usuarioId: user.USUARIO_ID,
      nome: user.NOME,
      perfil: normalizeText(user.PERFIL),
      tipo: 'PASSWORD',
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

function buildPasswordChangeToken(user) {
  assertJwtConfigured();

  return signJwt(
    {
      sub: String(user.USUARIO_ID),
      usuarioId: user.USUARIO_ID,
      username: user.NOME,
      purpose: PASSWORD_CHANGE_PURPOSE,
    },
    env.jwt.secret,
    { expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES_IN },
  );
}

function verifyPasswordChangeToken(token) {
  assertJwtConfigured();

  try {
    const payload = verifyJwt(token, env.jwt.secret);

    if (!payload || payload.purpose !== PASSWORD_CHANGE_PURPOSE || !payload.usuarioId) {
      throw new Error('Token sem propósito de alteração de senha.');
    }

    return payload;
  } catch (erro) {
    throw new HttpError(401, 'Token de alteração de senha inválido ou expirado.', {
      code: 'TOKEN_ALTERACAO_INVALIDO',
    });
  }
}

function formatUser(row) {
  return {
    id: String(row.USUARIO_ID),
    usuarioId: row.USUARIO_ID,
    name: normalizeText(row.NOME) || '',
    username: normalizeText(row.NOME) || '',
    perfil: normalizeText(row.PERFIL),
    email: normalizeText(row.EMAIL),
    matricula: normalizeText(row.MATRICULA),
  };
}

function createInvalidCredentialsError(details) {
  return new HttpError(401, 'Nome ou senha inválidos.', {
    code: 'CREDENCIAIS_INVALIDAS',
    details,
  });
}

function createBlockedUserError(message, details) {
  return new HttpError(403, message, {
    code: 'USUARIO_BLOQUEADO',
    details,
  });
}

function isUserBlocked(row) {
  return normalizeText(row.BLOQUEADO)?.toUpperCase() === 'S';
}

function isPasswordExpired(expirationDate) {
  if (!expirationDate) {
    return false;
  }

  const expiration = new Date(expirationDate);
  if (Number.isNaN(expiration.getTime())) {
    return false;
  }

  expiration.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiration <= today;
}

function passwordComplexityIssues(password) {
  const text = String(password || '');
  const issues = [];

  if (text.length < 6) {
    issues.push('A senha deve ter pelo menos 6 caracteres.');
  }

  if (!/[A-Za-zÀ-ÿ]/u.test(text)) {
    issues.push('Deve conter pelo menos uma letra (A-Z ou a-z).');
  }

  if (!/\d/u.test(text)) {
    issues.push('Deve conter pelo menos um número (0-9).');
  }

  if (!/[^A-Za-zÀ-ÿ0-9]/u.test(text)) {
    issues.push('Deve conter pelo menos um caractere especial (ex.: @ # $ % &).');
  }

  return issues;
}

function requirePasswordComplexity(password) {
  const issues = passwordComplexityIssues(password);

  if (issues.length) {
    throw badRequest('Senha inválida.', { criteriosPendentes: issues });
  }
}

function calculateExpirationDate(days) {
  const expirationDays = Number.isFinite(Number(days)) && Number(days) > 0
    ? Number(days)
    : DEFAULT_PASSWORD_EXPIRATION_DAYS;
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + expirationDays);

  return date;
}

async function findUserByName(tx, username) {
  const rows = await tx.query(
    `
      SELECT FIRST 1
        USUARIO_ID,
        NOME,
        SENHA,
        PERFIL,
        EMAIL,
        MATRICULA,
        EXPIRACAO,
        BLOQUEADO,
        FAILED_ATTEMPTS,
        EXPIRACAO_DIAS
      FROM TBUSUARIO
      WHERE COALESCE(DELETADO, 'N') = 'N'
        AND NOME = ?
    `,
    [username],
  );

  return rows[0] || null;
}

async function findUserById(tx, usuarioId) {
  const rows = await tx.query(
    `
      SELECT FIRST 1
        USUARIO_ID,
        NOME,
        SENHA,
        PERFIL,
        EMAIL,
        MATRICULA,
        BLOQUEADO,
        EXPIRACAO_DIAS
      FROM TBUSUARIO
      WHERE COALESCE(DELETADO, 'N') = 'N'
        AND USUARIO_ID = ?
    `,
    [usuarioId],
  );

  return rows[0] || null;
}

async function resetFailedAttempts(tx, usuarioId) {
  await tx.query(
    'UPDATE TBUSUARIO SET FAILED_ATTEMPTS = 0 WHERE USUARIO_ID = ?',
    [usuarioId],
  );
}

async function incrementFailedAttempts(tx, usuarioId) {
  await tx.query(
    `
      UPDATE TBUSUARIO
      SET FAILED_ATTEMPTS = COALESCE(FAILED_ATTEMPTS, 0) + 1
      WHERE USUARIO_ID = ?
    `,
    [usuarioId],
  );

  const rows = await tx.query(
    'SELECT FAILED_ATTEMPTS FROM TBUSUARIO WHERE USUARIO_ID = ?',
    [usuarioId],
  );

  return Number(rows[0]?.FAILED_ATTEMPTS || 0);
}

async function blockUser(tx, usuarioId) {
  await tx.query(
    "UPDATE TBUSUARIO SET BLOQUEADO = 'S' WHERE USUARIO_ID = ?",
    [usuarioId],
  );
}

async function registerLoginAudit(tx, user, context, options) {
  await auditService.registerAccessEvent({
    usuarioId: user.USUARIO_ID,
    usuarioNome: user.NOME,
    local: options.local,
    tipo: 'Processo',
    atividade: options.atividade,
    online: options.online,
    ip: context.ip,
    computador: context.computador,
    chaveId: user.USUARIO_ID,
  }, tx);
}

async function login(credentials, context = {}) {
  const username = normalizeText(credentials.username);
  const password = normalizeText(credentials.password);

  if (!username) {
    throw badRequest("Campo 'username' é obrigatório.");
  }

  if (!password) {
    throw badRequest("Campo 'password' é obrigatório.");
  }

  const result = await database.withTransaction(async (tx) => {
    const user = await findUserByName(tx, username);

    if (!user) {
      throw createInvalidCredentialsError();
    }

    if (isUserBlocked(user)) {
      await registerLoginAudit(tx, user, context, {
        local: 'CAD001',
        online: 'N',
        atividade: `${user.NOME} tentou login com conta Bloqueada`,
      });

      return {
        error: {
          status: 403,
          message: 'Usuário BLOQUEADO. Contacte o Administrador',
          code: 'USUARIO_BLOQUEADO',
          details: {
            usuarioId: user.USUARIO_ID,
          },
        },
      };
    }

    const expectedPassword = hashPassword(user.USUARIO_ID, password);
    const storedPassword = normalizeText(user.SENHA)?.toUpperCase();

    if (storedPassword !== expectedPassword) {
      const failedAttempts = await incrementFailedAttempts(tx, user.USUARIO_ID);

      if (failedAttempts >= MAX_LOGIN_FAILED_ATTEMPTS) {
        const message = 'Usuário bloqueado após 3 tentativas incorretas de Login. Contacte o Administrador.';

        await blockUser(tx, user.USUARIO_ID);
        await registerLoginAudit(tx, user, context, {
          local: 'CAD001',
          online: 'S',
          atividade: `${user.NOME}, ${message}`,
        });

        return {
          error: {
            status: 403,
            message,
            code: 'USUARIO_BLOQUEADO',
            details: {
              failedAttempts,
              threshold: MAX_LOGIN_FAILED_ATTEMPTS,
            },
          },
        };
      }

      return {
        error: {
          status: 401,
          message: 'Nome ou senha inválidos.',
          code: 'CREDENCIAIS_INVALIDAS',
          details: {
            failedAttempts,
            tentativasRestantes: MAX_LOGIN_FAILED_ATTEMPTS - failedAttempts,
          },
        },
      };
    }

    await resetFailedAttempts(tx, user.USUARIO_ID);

    if (isPasswordExpired(user.EXPIRACAO)) {
      return {
        passwordExpired: true,
        message: 'Senha expirada. Informe uma nova senha para continuar.',
        changeToken: buildPasswordChangeToken(user),
        user: formatUser(user),
      };
    }

    await registerLoginAudit(tx, user, context, {
      local: 'Login',
      online: 'S',
      atividade: `${user.NOME}, entrou no sistema`,
    });

    return {
      token: buildSessionToken(user),
      user: formatUser(user),
    };
  });

  if (result.error) {
    throw new HttpError(result.error.status, result.error.message, {
      code: result.error.code,
      details: result.error.details,
    });
  }

  return result;
}

async function hasPasswordBeenUsed(tx, usuarioId, password) {
  const rows = await tx.query(
    `
      SELECT FIRST 1 USUARIO_ID
      FROM TBUSUARIO_SENHA
      WHERE USUARIO_ID = ?
        AND SENHA = ?
    `,
    [usuarioId, hashPassword(usuarioId, password)],
  );

  return rows.length > 0;
}

async function changeExpiredPassword(data, context = {}) {
  const changeToken = normalizeText(data.changeToken);
  const newPassword = normalizeText(data.newPassword);
  const confirmPassword = normalizeText(data.confirmPassword);

  if (!changeToken) {
    throw badRequest("Campo 'changeToken' é obrigatório.");
  }

  if (!newPassword) {
    throw badRequest("Campo 'newPassword' é obrigatório.");
  }

  if (!confirmPassword) {
    throw badRequest("Campo 'confirmPassword' é obrigatório.");
  }

  if (newPassword !== confirmPassword) {
    throw badRequest('As senhas informadas não conferem.');
  }

  requirePasswordComplexity(newPassword);

  const tokenPayload = verifyPasswordChangeToken(changeToken);
  const usuarioId = Number(tokenPayload.usuarioId);

  return database.withTransaction(async (tx) => {
    const user = await findUserById(tx, usuarioId);

    if (!user) {
      throw new HttpError(401, 'Token de alteração de senha inválido ou expirado.', {
        code: 'TOKEN_ALTERACAO_INVALIDO',
      });
    }

    if (isUserBlocked(user)) {
      throw createBlockedUserError('Usuário BLOQUEADO. Contacte o Administrador', {
        usuarioId: user.USUARIO_ID,
      });
    }

    if (await hasPasswordBeenUsed(tx, user.USUARIO_ID, newPassword)) {
      throw conflict('Senha já utilizada. Por favor, insira outra senha.');
    }

    const passwordHash = hashPassword(user.USUARIO_ID, newPassword);
    const expirationDate = calculateExpirationDate(user.EXPIRACAO_DIAS);

    await tx.query(
      `
        UPDATE TBUSUARIO
        SET SENHA = ?,
            EXPIRACAO = ?
        WHERE USUARIO_ID = ?
      `,
      [passwordHash, expirationDate, user.USUARIO_ID],
    );

    await tx.query(
      `
        INSERT INTO TBUSUARIO_SENHA (USUARIO_ID, SENHA, DATA_INC)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
      [user.USUARIO_ID, passwordHash],
    );

    await registerLoginAudit(tx, user, context, {
      local: 'Login',
      online: 'S',
      atividade: `${user.NOME} alterou a senha.`,
    });

    return {
      user: formatUser(user),
      expiresAt: expirationDate,
    };
  });
}

module.exports = {
  MAX_LOGIN_FAILED_ATTEMPTS,
  PASSWORD_CHANGE_PURPOSE,
  changeExpiredPassword,
  hashPassword,
  login,
  passwordComplexityIssues,
};
