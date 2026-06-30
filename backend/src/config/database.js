const Firebird = require('node-firebird');

const { env, isFirebirdConfigured } = require('./env');

let pool = null;

class FirebirdConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FirebirdConfigError';
    this.code = 'FIREBIRD_CONFIG_INVALIDA';
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

      resolve(resultado);
    });
  });
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

async function withTransaction(callback) {
  let db;
  let transacao;

  try {
    db = await getConnection();
    transacao = await beginTransaction(db);

    const resultado = await callback({
      query: (sql, params = []) => runQueryOn(transacao, sql, params),
    });

    await commitTransaction(transacao);
    return resultado;
  } catch (erro) {
    if (transacao) {
      await rollbackTransaction(transacao);
    }

    throw erro;
  } finally {
    detach(db);
  }
}

async function transaction(operacoes) {
  if (!Array.isArray(operacoes)) {
    throw new TypeError('transaction espera um array de operacoes SQL.');
  }

  return withTransaction(async (tx) => {
    const resultados = [];

    for (const operacao of operacoes) {
      resultados.push(await tx.query(operacao.sql, operacao.params || []));
    }

    return resultados;
  });
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
  transaction,
  withTransaction,
  sanitizeError,
  FirebirdConfigError,
};
