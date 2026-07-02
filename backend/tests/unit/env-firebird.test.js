const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const {
  encryptSecret,
  generateCryptoKey,
} = require('../../src/utils/config-crypto');

const envModulePath = path.resolve(__dirname, '..', '..', 'src', 'config', 'env.js');
const ENV_KEYS = [
  'FIREBIRD_HOST',
  'FIREBIRD_PORT',
  'FIREBIRD_DATABASE',
  'FIREBIRD_USER',
  'FIREBIRD_PASSWORD',
  'FIREBIRD_ROLE',
  'FIREBIRD_CHARSET',
  'FIREBIRD_PAGE_SIZE',
  'FIREBIRD_POOL_MAX',
  'FIREBIRD_CONNECT_TIMEOUT_MS',
  'CAMERA_WEB_CONFIG_CRYPTO_KEY',
];

function withEnvValues(values, callback) {
  const previous = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

  ENV_KEYS.forEach((key) => {
    delete process.env[key];
  });

  Object.entries(values).forEach(([key, value]) => {
    process.env[key] = String(value);
  });

  delete require.cache[envModulePath];

  try {
    return callback();
  } finally {
    delete require.cache[envModulePath];
    previous.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key];
        return;
      }

      process.env[key] = value;
    });
  }
}

test('env.firebird.password usa senha descriptografada', () => {
  const key = generateCryptoKey();
  const encryptedPassword = encryptSecret('senha-firebird', key);

  withEnvValues({
    FIREBIRD_HOST: '192.168.0.10',
    FIREBIRD_PORT: '3050',
    FIREBIRD_DATABASE: 'C:\\dados\\camera.fdb',
    FIREBIRD_USER: 'SYSDBA',
    FIREBIRD_PASSWORD: encryptedPassword,
    FIREBIRD_CHARSET: 'WIN1252',
    CAMERA_WEB_CONFIG_CRYPTO_KEY: key,
  }, () => {
    const { env } = require('../../src/config/env');

    assert.equal(env.firebird.password, 'senha-firebird');
    assert.equal(env.firebird.host, '192.168.0.10');
    assert.equal(process.env.FIREBIRD_PASSWORD, encryptedPassword);
  });
});
