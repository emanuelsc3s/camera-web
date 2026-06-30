const assert = require('node:assert/strict');
const test = require('node:test');

const vectorMath = require('../../src/utils/vectorMath');

function descriptor(value) {
  return Array.from({ length: vectorMath.DESCRIPTOR_LENGTH }, () => value);
}

test('valida descriptor facial com exatamente 128 numeros finitos', () => {
  assert.equal(vectorMath.isValidDescriptor(descriptor(0.1)), true);
  assert.equal(vectorMath.isValidDescriptor([0.1]), false);
  assert.equal(vectorMath.isValidDescriptor(descriptor(Number.NaN)), false);
  assert.equal(vectorMath.isValidDescriptor('descriptor'), false);
});

test('converte descriptor para buffer de 512 bytes e recupera os floats', () => {
  const original = descriptor(0).map((_, index) => index / 1000);
  const buffer = vectorMath.descriptorToBuffer(original);
  const restored = vectorMath.bufferToDescriptor(buffer);

  assert.equal(buffer.length, vectorMath.DESCRIPTOR_BYTES);
  assert.equal(restored.length, vectorMath.DESCRIPTOR_LENGTH);

  for (let index = 0; index < original.length; index += 1) {
    assert.ok(Math.abs(restored[index] - original[index]) < 0.000001);
  }
});

test('calcula distancia euclidiana, match e confianca', () => {
  const distance = vectorMath.euclideanDistance([0, 0], [3, 4]);

  assert.equal(distance, 5);
  assert.equal(vectorMath.isMatch(0.4, 0.6), true);
  assert.equal(vectorMath.isMatch(0.6, 0.6), false);
  assert.equal(vectorMath.calculateConfidence(0.3, 0.6), 0.5);
});

test('encontra o melhor match entre candidatos', () => {
  const target = descriptor(0);
  const candidates = [
    { faceIdId: 1, descriptor: descriptor(0.1) },
    { faceIdId: 2, descriptor: descriptor(0) },
  ];

  const result = vectorMath.findBestMatch(target, candidates, 0.6);

  assert.equal(result.faceIdId, 2);
  assert.equal(result.isMatch, true);
  assert.equal(result.distance, 0);
  assert.equal(result.confidence, 1);
});
