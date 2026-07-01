const Firebird = require('node-firebird');

const { env, isFirebirdConfigured } = require('./env');

let pool = null;
const AUDIT_SESSION_NAMESPACE = 'USER_SESSION';
const AUDIT_SESSION_KEY = 'USUARIOLOGADO';
const AUDIT_SESSION_DEFAULT_USER = 'CAMERA_WEB';
const AUDIT_SESSION_MAX_LENGTH = 30;
const SET_AUDIT_SESSION_SQL = `
  SELECT RDB$SET_CONTEXT(
    '${AUDIT_SESSION_NAMESPACE}',
    '${AUDIT_SESSION_KEY}',
    CAST(? AS VARCHAR(255))
  ) AS CONTEXTO
  FROM RDB$DATABASE
`;

class FirebirdConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FirebirdConfigError';
    this.code = 'FIREBIRD_CONFIG_INVALIDA';
    this.status = 503;
    this.expose = true;
  }
}

function assertFirebirdConfigured() {
  if (!isFirebirdConfigured()) {
    throw new FirebirdConfigError(
      'Configure FIREBIRD_DATABASE, FIREBIRD_USER e FIREBIRD_PASSWORD no backend/.env antes de conectar.',
    );
  }
}

function getConnectionOptions() {
  assertFirebirdConfigured();

  return {
    host: env.firebird.host,
    port: env.firebird.port,
    database: env.firebird.database,
    user: env.firebird.user,
    password: env.firebird.password,
    lowercase_keys: false,
    role: env.firebird.role,
    pageSize: env.firebird.pageSize,
    encoding: env.firebird.charset,
    connectTimeout: env.firebird.connectTimeoutMs,
  };
}

function initializePool() {
  if (pool) {
    return pool;
  }

  pool = Firebird.pool(env.firebird.poolMax, getConnectionOptions());
  return pool;
}

function getConnection() {
  const activePool = initializePool();

  return new Promise((resolve, reject) => {
    activePool.get((erro, db) => {
      if (erro) {
        reject(erro);
        return;
      }

      resolve(db);
    });
  });
}

function normalizeSessionUser(usuarioNome) {
  const text = usuarioNome === undefined || usuarioNome === null
    ? ''
    : String(usuarioNome).trim();

  return (text || AUDIT_SESSION_DEFAULT_USER).slice(0, AUDIT_SESSION_MAX_LENGTH);
}

async function setSessionUserOn(executor, usuarioNome) {
  return runQueryOn(executor, SET_AUDIT_SESSION_SQL, [normalizeSessionUser(usuarioNome)]);
}

async function clearSessionUserOn(executor) {
  return runQueryOn(executor, SET_AUDIT_SESSION_SQL, [null]);
}

function detach(db) {
  if (db) {
    db.detach();
  }
}

function runQueryOn(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (erro, resultado) => {
      if (erro) {
        reject(erro);
        return;
      }

      materializeBlobRows(resultado, db)
        .then(resolve)
        .catch(reject);
    });
  });
}

function readBlobValue(value, executor) {
  if (typeof value !== 'function') {
    return Promise.resolve(value);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let chunksLength = 0;

    const onBlobReady = (erro, name, stream) => {
      if (erro) {
        reject(erro);
        return;
      }

      if (!stream) {
        resolve(null);
        return;
      }

      stream.on('data', (chunk) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunksLength += buffer.length;
        chunks.push(buffer);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks, chunksLength)));
      stream.on('error', reject);
    };

    try {
      if (executor && executor.constructor && executor.constructor.name === 'Transaction') {
        value(executor, onBlobReady);
        return;
      }

      value(onBlobReady);
    } catch (erro) {
      reject(erro);
    }
  });
}

async function materializeBlobRows(resultado, executor) {
  if (!Array.isArray(resultado)) {
    return resultado;
  }

  for (const row of resultado) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    for (const column of Object.keys(row)) {
      row[column] = await readBlobValue(row[column], executor);
    }
  }

  return resultado;
}

async function query(sql, params = []) {
  let db;

  try {
    db = await getConnection();
    return await runQueryOn(db, sql, params);
  } finally {
    detach(db);
  }
}

function createTransactionExecutor(transacao) {
  return {
    query: (sql, params = []) => runQueryOn(transacao, sql, params),
    setSessionUser: (usuarioNome) => setSessionUserOn(transacao, usuarioNome),
  };
}

function beginTransaction(db) {
  return new Promise((resolve, reject) => {
    db.transaction(Firebird.ISOLATION_READ_COMMITTED, (erro, transacao) => {
      if (erro) {
        reject(erro);
        return;
      }

      resolve(transacao);
    });
  });
}

function commitTransaction(transacao) {
  return new Promise((resolve, reject) => {
    transacao.commit((erro) => (erro ? reject(erro) : resolve()));
  });
}

function rollbackTransaction(transacao) {
  return new Promise((resolve) => {
    transacao.rollback(() => resolve());
  });
}

async function withTransaction(callback, options = {}) {
  let db;
  let transacao;

  try {
    db = await getConnection();
    transacao = await beginTransaction(db);
    const tx = createTransactionExecutor(transacao);

    if (options.sessionUser) {
      await tx.setSessionUser(options.sessionUser);
    }

    const resultado = await callback(tx);

    await commitTransaction(transacao);
    return resultado;
  } catch (erro) {
    if (transacao) {
      await rollbackTransaction(transacao);
    }

    throw erro;
  } finally {
    if (db) {
      try {
        await clearSessionUserOn(db);
      } catch (erro) {
        console.error('Falha ao limpar contexto de auditoria do Firebird:', erro.message);
      }
    }

    detach(db);
  }
}

async function transaction(operacoes, options = {}) {
  if (!Array.isArray(operacoes)) {
    throw new TypeError('transaction espera um array de operacoes SQL.');
  }

  return withTransaction(async (tx) => {
    const resultados = [];

    for (const operacao of operacoes) {
      resultados.push(await tx.query(operacao.sql, operacao.params || []));
    }

    return resultados;
  }, options);
}

function sanitizeError(erro) {
  return {
    name: erro.name || 'FirebirdError',
    code: erro.code || erro.gdscode || null,
    sqlCode: erro.sqlCode || erro.sqlcode || null,
    message: erro.message || 'Falha desconhecida ao acessar o Firebird.',
  };
}

async function ping() {
  const inicio = process.hrtime.bigint();

  try {
    const resultado = await query('SELECT 1 AS TESTE FROM RDB$DATABASE');
    const fim = process.hrtime.bigint();

    return {
      ok: true,
      latencyMs: Number(fim - inicio) / 1_000_000,
      resultado,
    };
  } catch (erro) {
    const fim = process.hrtime.bigint();

    return {
      ok: false,
      latencyMs: Number(fim - inicio) / 1_000_000,
      error: sanitizeError(erro),
    };
  }
}

async function closePool() {
  if (!pool) {
    return;
  }

  const poolToClose = pool;
  pool = null;

  await new Promise((resolve, reject) => {
    try {
      if (poolToClose.destroy.length > 0) {
        poolToClose.destroy(resolve);
      } else {
        poolToClose.destroy();
        resolve();
      }
    } catch (erro) {
      reject(erro);
    }
  });
}

module.exports = {
  closePool,
  getConnection,
  getConnectionOptions,
  initializePool,
  ping,
  query,
  setSessionUser: setSessionUserOn,
  transaction,
  withTransaction,
  sanitizeError,
  FirebirdConfigError,
};
