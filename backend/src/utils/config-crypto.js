const crypto = require('crypto');

const SECRET_PREFIX = 'enc:v1:';
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

function generateCryptoKey() {
  return crypto.randomBytes(KEY_LENGTH_BYTES).toString('base64url');
}

function decodeBase64Url(value, fieldName) {
  try {
    return Buffer.from(String(value || ''), 'base64url');
  } catch (erro) {
    throw new Error(`${fieldName} invalido para descriptografia.`);
  }
}

function resolveKeyBuffer(keyText) {
  const key = decodeBase64Url(String(keyText || '').trim(), 'Chave de criptografia');

  if (key.length !== KEY_LENGTH_BYTES) {
    throw new Error('Chave de criptografia invalida para configuracao local.');
  }

  return key;
}

function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(SECRET_PREFIX);
}

function encryptSecret(value, keyText) {
  const key = resolveKeyBuffer(keyText);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    'enc',
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptSecret(value, keyText) {
  if (!isEncryptedSecret(value)) {
    return value || '';
  }

  const parts = String(value).split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Senha criptografada em formato invalido.');
  }

  const key = resolveKeyBuffer(keyText);
  const iv = decodeBase64Url(parts[2], 'Vetor de inicializacao');
  const authTag = decodeBase64Url(parts[3], 'Tag de autenticacao');
  const encrypted = decodeBase64Url(parts[4], 'Conteudo criptografado');

  if (iv.length !== IV_LENGTH_BYTES || authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error('Senha criptografada em formato invalido.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  SECRET_PREFIX,
  decryptSecret,
  encryptSecret,
  generateCryptoKey,
  isEncryptedSecret,
};
