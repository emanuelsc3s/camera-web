const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const jsonwebtoken = require('jsonwebtoken');

const backendRoot = path.resolve(__dirname, '..', '..');
const jwtSecret = 'segredo-de-teste';

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

async function createServer(mockDatabase, envFilePath, uploadDir) {
  clearBackendModules();

  const databasePath = path.join(backendRoot, 'src', 'config', 'database.js');
  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: mockDatabase,
  };

  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = jwtSecret;
  process.env.CAMERA_WEB_ENV_PATH = envFilePath;
  process.env.CAMERA_WEB_LINHA_PRODUCAO_ID = '';
  process.env.CAMERA_WEB_ESTACAO_NOME = '';
  process.env.UPLOAD_DIR = uploadDir;

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

function createToken(usuarioId = 12) {
  return jsonwebtoken.sign(
    {
      sub: String(usuarioId),
      usuarioId,
      tipo: 'PASSWORD',
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: '8h',
    },
  );
}

async function requestJson(baseUrl, method, pathName, body, token = createToken()) {
  const headers = {
    'content-type': 'application/json',
    'x-forwarded-for': '10.0.0.50',
    'x-terminal-id': 'TERMINAL-CONFIG',
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function createOpAtiva(overrides = {}) {
  return {
    OP_ID: 999,
    OP: '146728',
    ERP_PRODUTO: 'ERP001',
    LOTE: '25L12683',
    VALIDADE: new Date('2027-10-01T00:00:00'),
    PRODUTO: 'SOL. CLORETO DE SODIO 0,9% 500ML - SF',
    REGISTRO_ANVISA: '1108500010193',
    GTIN: '7898166041400',
    LINHAPRODUCAO_ID: 5,
    ...overrides,
  };
}

async function withTempServer(handler, options = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'camera-web-config-'));
  const envFilePath = path.join(tempDir, '.env');
  const uploadDir = path.join(tempDir, 'uploads');

  await fs.writeFile(envFilePath, options.envContent || '', 'utf8');

  const mockDatabase = createMockDatabase(options.databaseHandler || (async ({ sql }) => {
    if (/FROM TBUSUARIO/.test(sql)) {
      return [{
        USUARIO_ID: 12,
        NOME: 'Administrador',
        PERFIL: options.perfil || 'Administrador',
      }];
    }

    if (/FROM TBLINHA_PRODUCAO/.test(sql)) {
      return options.linhaExiste === false ? [] : [{ LINHAPRODUCAO_ID: 5 }];
    }

    if (/FROM TBOP o/.test(sql)) {
      return options.opAtiva === false ? [] : [createOpAtiva()];
    }

    return [];
  }));

  const server = await createServer(mockDatabase, envFilePath, uploadDir);

  try {
    await handler({ server, mockDatabase, envFilePath, tempDir });
  } finally {
    await server.close();
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.CAMERA_WEB_ENV_PATH;
    delete process.env.CAMERA_WEB_LINHA_PRODUCAO_ID;
    delete process.env.CAMERA_WEB_ESTACAO_NOME;
    delete process.env.UPLOAD_DIR;
  }
}

test('GET /api/configuracao-estacao exige token válido', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(server.baseUrl, 'GET', '/api/configuracao-estacao', undefined, null);

    assert.equal(result.status, 401);
    assert.equal(result.body.code, 'NAO_AUTENTICADO');
  });
});

test('GET /api/configuracao-estacao bloqueia usuário sem perfil Administrador', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(server.baseUrl, 'GET', '/api/configuracao-estacao');

    assert.equal(result.status, 403);
    assert.equal(result.body.code, 'ACESSO_NEGADO');
  }, { perfil: 'Operador' });
});

test('GET /api/configuracao-estacao/ops-cadastradas exige token válido', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(
      server.baseUrl,
      'GET',
      '/api/configuracao-estacao/ops-cadastradas',
      undefined,
      null,
    );

    assert.equal(result.status, 401);
    assert.equal(result.body.code, 'NAO_AUTENTICADO');
  });
});

test('GET /api/configuracao-estacao/ops-cadastradas lista OPs paginadas da TBOP', async () => {
  await withTempServer(async ({ server, mockDatabase }) => {
    const result = await requestJson(
      server.baseUrl,
      'GET',
      '/api/configuracao-estacao/ops-cadastradas?page=2&limit=2',
    );

    const countQuery = mockDatabase.calls.find((call) => /SELECT\s+COUNT\(\*\) AS TOTAL\s+FROM/.test(call.sql));
    const listQuery = mockDatabase.calls.find((call) => /SELECT\s+OP_ID,\s+OP,\s+STATUS/.test(call.sql));

    assert.equal(result.status, 200);
    assert.deepEqual(result.body.pagination, {
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    assert.deepEqual(result.body.data, [{
      opId: 1001,
      op: '146900',
      status: 'Aberto',
      linhaProducaoId: 8,
      linhaProducao: 'LINHA_08_ENVASE',
      produto: 'PRODUTO TESTE',
      lote: 'L001',
      validade: '10/2027',
    }]);
    assert.match(countQuery.sql, /FROM TBOP/);
    assert.doesNotMatch(listQuery.sql, /GROUP BY/);
    assert.match(listQuery.sql, /COALESCE\(DELETADO, 'N'\) = 'N'/);
    assert.match(listQuery.sql, /ORDER BY OP_ID DESC/);
    assert.match(listQuery.sql, /ROWS \? TO \?/);
    assert.deepEqual(listQuery.params, [3, 4]);
  }, {
    databaseHandler: async ({ sql }) => {
      if (/FROM TBUSUARIO/.test(sql)) {
        return [{
          USUARIO_ID: 12,
          NOME: 'Administrador',
          PERFIL: 'Administrador',
        }];
      }

      if (/SELECT\s+COUNT\(\*\) AS TOTAL\s+FROM/.test(sql)) {
        return [{ TOTAL: 3 }];
      }

      if (/SELECT\s+OP_ID,\s+OP,\s+STATUS/.test(sql)) {
        return [{
          OP_ID: 1001,
          OP: '146900',
          STATUS: 'Aberto',
          LINHAPRODUCAO_ID: 8,
          LINHAPRODUCAO: 'LINHA_08_ENVASE',
          PRODUTO: 'PRODUTO TESTE',
          LOTE: 'L001',
          VALIDADE: new Date('2027-10-01T00:00:00'),
        }];
      }

      return [];
    },
  });
});

test('GET /api/configuracao-estacao/ops-cadastradas usa fallback quando linha da TBOP está vazia', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(
      server.baseUrl,
      'GET',
      '/api/configuracao-estacao/ops-cadastradas',
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.data[0].opId, 990);
    assert.equal(result.body.data[0].op, '146800');
    assert.equal(result.body.data[0].linhaProducaoId, 7);
    assert.equal(result.body.data[0].linhaProducao, 'LINHA_7');
    assert.equal(result.body.pagination.totalPages, 1);
  }, {
    databaseHandler: async ({ sql }) => {
      if (/FROM TBUSUARIO/.test(sql)) {
        return [{
          USUARIO_ID: 12,
          NOME: 'Administrador',
          PERFIL: 'Administrador',
        }];
      }

      if (/SELECT\s+COUNT\(\*\) AS TOTAL\s+FROM/.test(sql)) {
        return [{ TOTAL: 1 }];
      }

      if (/SELECT\s+OP_ID,\s+OP,\s+STATUS/.test(sql)) {
        return [{
          OP_ID: 990,
          OP: '146800',
          STATUS: 'Aberto',
          LINHAPRODUCAO_ID: 7,
          LINHAPRODUCAO: '   ',
          PRODUTO: 'PRODUTO SEM LINHA DESCRITA',
          LOTE: 'L002',
          VALIDADE: null,
        }];
      }

      return [];
    },
  });
});

test('PUT /api/configuracao-estacao grava somente chaves permitidas e audita alteração', async () => {
  await withTempServer(async ({ server, mockDatabase, envFilePath }) => {
    const result = await requestJson(server.baseUrl, 'PUT', '/api/configuracao-estacao', {
      linhaProducaoId: 5,
      estacaoNome: 'LINHA_05_MANUAL',
      FIREBIRD_PASSWORD: 'nao_deve_ser_gravado',
    });

    const envContent = await fs.readFile(envFilePath, 'utf8');
    const insertAudit = mockDatabase.calls.find((call) => /INSERT INTO TBACESSO/.test(call.sql));

    assert.equal(result.status, 200);
    assert.equal(result.body.linhaProducaoId, 5);
    assert.equal(result.body.estacaoNome, 'LINHA_05_MANUAL');
    assert.equal(result.body.opAtiva.opId, 999);
    assert.match(envContent, /CAMERA_WEB_LINHA_PRODUCAO_ID=5/);
    assert.match(envContent, /CAMERA_WEB_ESTACAO_NOME=LINHA_05_MANUAL/);
    assert.doesNotMatch(envContent, /nao_deve_ser_gravado/);
    assert.doesNotMatch(JSON.stringify(result.body), /FIREBIRD_PASSWORD|JWT_SECRET/i);
    assert.equal(insertAudit.params[2], 'CONFIG_ESTACAO');
    assert.equal(insertAudit.params[3], 'CONFIG_UPDATE');
  }, {
    envContent: 'FIREBIRD_PASSWORD=masterkey\nJWT_SECRET=segredo\n',
  });
});

test('GET /api/estacao/contexto retorna 409 quando estação não está configurada', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(server.baseUrl, 'GET', '/api/estacao/contexto', undefined, null);

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'ESTACAO_NAO_CONFIGURADA');
  });
});

test('GET /api/estacao/contexto busca OP ativa com START e ordem por OP_ID', async () => {
  await withTempServer(async ({ server, mockDatabase }) => {
    const result = await requestJson(server.baseUrl, 'GET', '/api/estacao/contexto', undefined, null);
    const opQuery = mockDatabase.calls.find((call) => /FROM TBOP o/.test(call.sql));

    assert.equal(result.status, 200);
    assert.equal(result.body.linhaProducaoId, 5);
    assert.equal(result.body.opAtiva.opId, 999);
    assert.match(opQuery.sql, /o\."START" = 'S'/);
    assert.match(opQuery.sql, /o\.LINHAPRODUCAO_ID = \?/);
    assert.match(opQuery.sql, /ORDER BY o\.OP_ID DESC/);
    assert.deepEqual(opQuery.params, [5]);
  }, {
    envContent: 'CAMERA_WEB_LINHA_PRODUCAO_ID=5\nCAMERA_WEB_ESTACAO_NOME=LINHA_05_MANUAL\n',
  });
});

test('POST /api/inspecoes rejeita salvamento quando OP ativa mudou', async () => {
  await withTempServer(async ({ server }) => {
    const result = await requestJson(server.baseUrl, 'POST', '/api/inspecoes', {
      opAtivaIdConfirmado: 998,
      fotoBase64: 'data:image/jpeg;base64,/9j/2Q==',
      inspectionStates: {
        gtin: true,
        datamatrix: true,
        lote: true,
        validade: true,
      },
    }, null);

    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'OP_ATIVA_ALTERADA');
  }, {
    envContent: 'CAMERA_WEB_LINHA_PRODUCAO_ID=5\nCAMERA_WEB_ESTACAO_NOME=LINHA_05_MANUAL\n',
  });
});
