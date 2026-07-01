const path = require('path');
const dotenv = require('dotenv');

const rootDir = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

function parseInteger(nome, valor, padrao, minimo = 0) {
  if (valor === undefined || valor === '') {
    return padrao;
  }

  const numero = Number.parseInt(valor, 10);
  if (Number.isNaN(numero) || numero < minimo) {
    throw new Error(`Variavel de ambiente invalida: ${nome}`);
  }

  return numero;
}

function parseBoolean(valor, padrao) {
  if (valor === undefined || valor === '') {
    return padrao;
  }

  return ['1', 'true', 'yes', 'sim', 's'].includes(String(valor).toLowerCase());
}

function parseList(valor) {
  if (!valor) {
    return [];
  }

  return valor
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const raw = process.env;
const rawBackendPort = raw.PORT || raw.BACKEND_PORT;

const env = {
  rootDir,
  nodeEnv: raw.NODE_ENV || 'development',
  host: raw.HOST || '127.0.0.1',
  port: parseInteger(raw.PORT ? 'PORT' : 'BACKEND_PORT', rawBackendPort, 8000, 1),
  apiPrefix: raw.API_PREFIX || '/api',
  requestBodyLimit: raw.REQUEST_BODY_LIMIT || '8mb',
  cors: {
    origins: parseList(
      raw.CORS_ORIGINS ||
        'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173',
    ),
    allowLocalhost: parseBoolean(raw.CORS_ALLOW_LOCALHOST, true),
  },
  firebird: {
    host: raw.FIREBIRD_HOST || '127.0.0.1',
    port: parseInteger('FIREBIRD_PORT', raw.FIREBIRD_PORT, 3050, 1),
    database: raw.FIREBIRD_DATABASE || '',
    user: raw.FIREBIRD_USER || 'SYSDBA',
    password: raw.FIREBIRD_PASSWORD || '',
    role: raw.FIREBIRD_ROLE || null,
    charset: raw.FIREBIRD_CHARSET || 'WIN1252',
    pageSize: parseInteger('FIREBIRD_PAGE_SIZE', raw.FIREBIRD_PAGE_SIZE, 4096, 1024),
    poolMax: parseInteger('FIREBIRD_POOL_MAX', raw.FIREBIRD_POOL_MAX, 5, 1),
    connectTimeoutMs: parseInteger(
      'FIREBIRD_CONNECT_TIMEOUT_MS',
      raw.FIREBIRD_CONNECT_TIMEOUT_MS,
      10000,
      0,
    ),
  },
  uploadDir: raw.UPLOAD_DIR || 'uploads',
  jwt: {
    secret: raw.JWT_SECRET || '',
    expiresIn: raw.JWT_EXPIRES_IN || '8h',
  },
};

function isFirebirdConfigured() {
  return Boolean(env.firebird.database && env.firebird.user && env.firebird.password);
}

module.exports = {
  env,
  isFirebirdConfigured,
};
