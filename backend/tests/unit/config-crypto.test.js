const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SECRET_PREFIX,
  decryptSecret,
  encryptSecret,
  generateCryptoKey,
  isEncryptedSecret,
} = require('../../src/utils/config-crypto');

test('criptografa e descriptografa segredo local no formato enc:v1', () => {
  const key = generateCryptoKey();
  const encrypted = encryptSecret('senha-de-teste', key);

  assert.match(encrypted, new RegExp(`^${SECRET_PREFIX}`));
  assert.notEqual(encrypted, 'senha-de-teste');
  assert.equal(isEncryptedSecret(encrypted), true);
  assert.equal(decryptSecret(encrypted, key), 'senha-de-teste');
});

test('mantém valor legado em texto puro sem exigir chave', () => {
  assert.equal(isEncryptedSecret('senha-legada'), false);
  assert.equal(decryptSecret('senha-legada', ''), 'senha-legada');
});

test('rejeita payload criptografado inválido', () => {
  const key = generateCryptoKey();

  assert.throws(
    () => decryptSecret('enc:v1:invalido', key),
    /formato invalido/,
  );
});

test('rejeita chave inválida para criptografia', () => {
  assert.throws(
    () => encryptSecret('senha', 'chave-invalida'),
    /Chave de criptografia invalida/,
  );
});
