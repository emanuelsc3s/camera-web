const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const vectorMath = require('../../src/utils/vectorMath');
const { resetRateLimiters } = require('../../src/middlewares/rate-limit.middleware');

const backendRoot = path.resolve(__dirname, '..', '..');

function descriptor(value = 0) {
  return Array.from({ length: vectorMath.DESCRIPTOR_LENGTH }, () => value);
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
  process.env.JWT_SECRET = 'segredo-de-teste';

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

async function requestJson(baseUrl, method, pathName, body, headers = {}) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '10.0.0.10',
      'x-terminal-id': 'TERMINAL-01',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test('POST /api/face-id/register rejeita payload com foto/base64 sem tocar no banco', async () => {
  const mockDatabase = createMockDatabase(async () => []);
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/face-id/register', {
      usuarioId: 1,
      name: 'Operador',
      descriptor: descriptor(0),
      photoBase64: 'data:image/jpeg;base64,AAA',
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.match(result.body.error, /não deve conter foto/i);
    assert.equal(mockDatabase.calls.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/face-id/register persiste somente descriptor e audita cadastro', async () => {
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/SELECT FIRST 1 FACEID_ID/.test(sql)) {
      return [];
    }

    if (/GEN_TBUSUARIO_FACEID_ID/.test(sql)) {
      return [{ ID: 101 }];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/face-id/register', {
      usuarioId: 1,
      name: 'Operador',
      matricula: 'MAT001',
      descriptor: descriptor(0.12),
    });

    const insertFaceId = mockDatabase.calls.find((call) => /INSERT INTO TBUSUARIO_FACEID/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 201);
    assert.equal(result.body.success, true);
    assert.equal(result.body.data.faceIdId, 101);
    assert.equal(result.body.data.descriptorOnly, true);
    assert.ok(Buffer.isBuffer(insertFaceId.params[2]));
    assert.equal(insertFaceId.params[2].length, vectorMath.DESCRIPTOR_BYTES);
    assert.equal(insertAudit.params[2], 'WEB_FACE_ID');
    assert.equal(insertAudit.params[3], 'FACE_ID_REGISTER');
    assert.doesNotMatch(JSON.stringify(mockDatabase.calls), /photoBase64|fotoBase64|image\/jpeg/i);
  } finally {
    await server.close();
  }
});

test('POST /api/face-id/authenticate autentica por distancia euclidiana e registra TBACESSO', async () => {
  const storedDescriptor = descriptor(0);
  const mockDatabase = createMockDatabase(async ({ sql }) => {
    if (/FROM TBUSUARIO_FACEID f/.test(sql) && /DESCRIPTOR_FACIAL/.test(sql)) {
      return [{
        FACEID_ID: 77,
        USUARIO_ID: 12,
        DESCRIPTOR_FACIAL: vectorMath.descriptorToBuffer(storedDescriptor),
        MATRICULA: 'MAT012',
        NOME: 'Operador',
        EMAIL: 'operador@example.local',
        FAILED_ATTEMPTS: 0,
      }];
    }

    return [];
  });
  const server = await createServer(mockDatabase);

  try {
    const result = await requestJson(server.baseUrl, 'POST', '/api/face-id/authenticate', {
      descriptor: descriptor(0),
      threshold: 0.6,
    });

    const resetAttempts = mockDatabase.calls.find((call) => /FAILED_ATTEMPTS = 0/.test(call.sql));
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.authenticated, true);
    assert.equal(result.body.data.faceIdId, 77);
    assert.equal(result.body.data.confidence, 1);
    assert.equal(typeof result.body.token, 'string');
    assert.equal(resetAttempts.params[0], 12);
    assert.equal(insertAudit.params[2], 'WEB_FACE_ID');
    assert.equal(insertAudit.params[3], 'FACE_ID_AUTH_SUCCESS');
    assert.match(insertAudit.params[4], /autenticacao_facial/);
  } finally {
    await server.close();
  }
});

test('POST /api/face-id/authenticate aplica rate limit de 5 tentativas por minuto', async () => {
  const mockDatabase = createMockDatabase(async () => []);
  const server = await createServer(mockDatabase);

  try {
    const payload = { descriptor: [1, 2, 3] };
    let lastResult;

    for (let tentativa = 0; tentativa < 6; tentativa += 1) {
      lastResult = await requestJson(
        server.baseUrl,
        'POST',
        '/api/face-id/authenticate',
        payload,
        { 'x-forwarded-for': '10.0.0.99' },
      );
    }

    assert.equal(lastResult.status, 429);
    assert.equal(lastResult.body.success, false);
    assert.equal(lastResult.body.code, 'MUITAS_REQUISICOES');
  } finally {
    await server.close();
  }
});
