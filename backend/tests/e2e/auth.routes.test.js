const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const jsonwebtoken = require('jsonwebtoken');

const { resetRateLimiters } = require('../../src/middlewares/rate-limit.middleware');

const backendRoot = path.resolve(__dirname, '..', '..');
const jwtSecret = 'segredo-de-teste';

function hashPassword(usuarioId, password) {
  return crypto
    .createHash('md5')
    .update(`${usuarioId}${String(password || '').trim()}`, 'utf8')
    .digest('hex')
    .toUpperCase();
}

function createChangeToken(usuarioId) {
  return jsonwebtoken.sign(
    {
      sub: String(usuarioId),
      usuarioId,
      purpose: 'SENHA_EXPIRADA',
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '15m',
    },
  );
}

function clearBackendModules() {
  const srcRoot = path.join(backendRoot, 'src');

  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.startsWith(srcRoot)) {
      delete require.cache[cacheKey];
    }
  });
}

function createMockDatabase(handler) {
  const calls = [];

  async function runQuery(scope, sql, params = []) {
    const call = { scope, sql, params };
    calls.push(call);
    const result = await handler(call);
    return result === undefined ? [] : result;
  }

  return {
    calls,
    async query(sql, params = []) {
      return runQuery('db', sql, params);
    },
    async withTransaction(callback) {
      return callback({
        query(sql, params = []) {
          return runQuery('tx', sql, params);
        },
        setSessionUser(usuarioNome) {
          return runQuery('tx', 'SET_SESSION_USER', [usuarioNome]);
        },
      });
    },
    async ping() {
      return { ok: true, latencyMs: 1 };
    },
    async closePool() {},
  };
}

async function createServer(mockDatabase) {
  clearBackendModules();
  resetRateLimiters();

  const databasePath = path.join(backendRoot, 'src', 'config', 'database.js');
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: mockDatabase,
  };

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = jwtSecret;

  const app = require('../../src/app');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((erro) => (erro ? reject(erro) : resolve()));
      });
    },
  };
}

async function requestJson(baseUrl, method, pathName, body) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '10.0.0.20',
      'x-terminal-id': 'TERMINAL-LOGIN',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function createUser(overrides = {}) {
  return {
    USUARIO_ID: 12,
    NOME: 'Operador',
    SENHA: hashPassword(12, 'Senha@123'),
    PERFIL: 'Operador',
    EMAIL: 'operador@example.local',
    MATRICULA: 'MAT012',
    EXPIRACAO: new Date('2099-01-01T00:00:00'),
    BLOQUEADO: 'N',
    FAILED_ATTEMPTS: 0,
    EXPIRACAO_DIAS: 60,
    ...overrides,
  };
}

test('POST /api/auth/login autentica usuário válido, zera falhas e audita', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql) && /NOME = \?/.test(sql)) {
      return [createUser()];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'Operador',
      password: 'Senha@123',
    });

    const resetAttempts = mockDatabase.calls.find((call) => /FAILED_ATTEMPTS = 0/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(typeof result.body.token, 'string');
    assert.equal(result.body.user.usuarioId, 12);
    assert.equal(resetAttempts.params[0], 12);
    assert.equal(insertAudit.params[2], 'Login');
    assert.equal(insertAudit.params[3], 'Processo');
    assert.match(insertAudit.params[4], /entrou no sistema/);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/login audita erro genérico para usuário inexistente', async () => {
  const mockDatabase = createMockDatabase(async () => []);
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'NaoExiste',
      password: 'Senha@123',
    });

    assert.equal(result.status, 401);
    assert.equal(result.body.code, 'CREDENCIAIS_INVALIDAS');
    assert.equal(result.body.error, 'Nome ou senha inválidos.');

    const updateUser = mockDatabase.calls.find((call) => /UPDATE TBUSUARIO/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(updateUser, undefined);
    assert.equal(insertAudit.params[0], null);
    assert.equal(insertAudit.params[1], 'NaoExiste');
    assert.equal(insertAudit.params[2], 'CAD001');
    assert.equal(insertAudit.params[5], 'N');
    assert.equal(insertAudit.params[8], null);
    assert.match(insertAudit.params[4], /Usuário não identificado/);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/login incrementa tentativas quando senha está incorreta', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql) && /NOME = \?/.test(sql)) {
      return [createUser()];
    }

    if (/SELECT FAILED_ATTEMPTS/.test(sql)) {
      return [{ FAILED_ATTEMPTS: 1 }];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'Operador',
      password: 'SenhaErrada@1',
    });

    const incrementAttempts = mockDatabase.calls.find((call) => /COALESCE\(FAILED_ATTEMPTS, 0\) \+ 1/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 401);
    assert.equal(result.body.code, 'CREDENCIAIS_INVALIDAS');
    assert.equal(result.body.error, 'Nome ou senha inválidos. Você tem 2 tentativa(s) restante(s).');
    assert.equal(result.body.details.tentativasRestantes, 2);
    assert.equal(incrementAttempts.params[0], 12);
    assert.equal(insertAudit.params[2], 'CAD001');
    assert.equal(insertAudit.params[5], 'N');
    assert.match(insertAudit.params[4], /Nome ou senha inválidos\. Você tem 2 tentativa\(s\) restante\(s\)\./);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/login bloqueia usuário na terceira senha incorreta e audita', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql) && /NOME = \?/.test(sql)) {
      return [createUser({ FAILED_ATTEMPTS: 2 })];
    }

    if (/SELECT FAILED_ATTEMPTS/.test(sql)) {
      return [{ FAILED_ATTEMPTS: 3 }];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'Operador',
      password: 'SenhaErrada@1',
    });

    const blockUser = mockDatabase.calls.find((call) => /SET BLOQUEADO = 'S'/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'USUARIO_BLOQUEADO');
    assert.equal(blockUser.params[0], 12);
    assert.equal(insertAudit.params[2], 'CAD001');
    assert.match(insertAudit.params[4], /bloqueado após 3 tentativas/);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/login rejeita usuário já bloqueado e audita tentativa', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql) && /NOME = \?/.test(sql)) {
      return [createUser({ BLOQUEADO: 'S' })];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'Operador',
      password: 'Senha@123',
    });

    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'USUARIO_BLOQUEADO');
    assert.equal(insertAudit.params[2], 'CAD001');
    assert.equal(insertAudit.params[5], 'N');
  } finally {
    await server.close();
  }
});

test('POST /api/auth/login retorna changeToken quando senha válida está expirada', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql) && /NOME = \?/.test(sql)) {
      return [createUser({ EXPIRACAO: new Date('2020-01-01T00:00:00') })];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/login', {
      username: 'Operador',
      password: 'Senha@123',
    });

    const resetAttempts = mockDatabase.calls.find((call) => /FAILED_ATTEMPTS = 0/.test(call.sql));

    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'SENHA_EXPIRADA');
    assert.equal(typeof result.body.changeToken, 'string');
    assert.equal(resetAttempts.params[0], 12);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/change-expired-password rejeita senha fraca sem tocar no banco', async () => {
  const mockDatabase = createMockDatabase(async () => []);
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/change-expired-password', {
      changeToken: createChangeToken(12),
      newPassword: 'abc123',
      confirmPassword: 'abc123',
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'REQUISICAO_INVALIDA');
    assert.equal(mockDatabase.calls.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/change-expired-password rejeita confirmação divergente', async () => {
  const mockDatabase = createMockDatabase(async () => []);
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/change-expired-password', {
      changeToken: createChangeToken(12),
      newPassword: 'Nova@123',
      confirmPassword: 'Outra@123',
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.code, 'REQUISICAO_INVALIDA');
    assert.equal(mockDatabase.calls.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/auth/change-expired-password rejeita senha já utilizada', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO_SENHA/.test(sql)) {
      return [{ USUARIO_ID: 12 }];
    }

    if (/FROM TBUSUARIO/.test(sql) && /USUARIO_ID = \?/.test(sql)) {
      return [createUser()];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/change-expired-password', {
      changeToken: createChangeToken(12),
      newPassword: 'Nova@123',
      confirmPassword: 'Nova@123',
    });

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'CONFLITO');
  } finally {
    await server.close();
  }
});

test('POST /api/auth/change-expired-password atualiza senha, histórico e auditoria', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO_SENHA/.test(sql)) {
      return [];
    }

    if (/FROM TBUSUARIO/.test(sql) && /USUARIO_ID = \?/.test(sql)) {
      return [createUser()];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/auth/change-expired-password', {
      changeToken: createChangeToken(12),
      newPassword: 'Nova@123',
      confirmPassword: 'Nova@123',
    });

    const updatePassword = mockDatabase.calls.find((call) => /UPDATE TBUSUARIO/.test(call.sql) && /SET SENHA =/.test(call.sql));
    const insertHistory = mockDatabase.calls.find((call) => /INSERT INTO TBUSUARIO_SENHA/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(updatePassword.params[0], hashPassword(12, 'Nova@123'));
    assert.equal(updatePassword.params[2], 12);
    assert.equal(insertHistory.params[0], 12);
    assert.equal(insertHistory.params[1], hashPassword(12, 'Nova@123'));
    assert.match(insertAudit.params[4], /alterou a senha/);
  } finally {
    await server.close();
  }
});
