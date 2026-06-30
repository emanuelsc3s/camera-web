const DESCRIPTOR_LENGTH = 128;
const FLOAT_BYTES = 4;
const DESCRIPTOR_BYTES = DESCRIPTOR_LENGTH * FLOAT_BYTES;

function assertSameLength(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Vetores devem ter o mesmo tamanho.');
  }
}

function euclideanDistance(a, b) {
  assertSameLength(a, b);

  let sum = 0;

  for (let index = 0; index < a.length; index += 1) {
    const diff = a[index] - b[index];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

function isMatch(distance, threshold = 0.6) {
  return Number.isFinite(distance) && distance < threshold;
}

function calculateConfidence(distance, threshold = 0.6) {
  if (!Number.isFinite(distance) || threshold <= 0 || distance >= threshold) {
    return 0;
  }

  return Number((1 - distance / threshold).toFixed(6));
}

function isValidDescriptor(descriptor) {
  return Array.isArray(descriptor) &&
    descriptor.length === DESCRIPTOR_LENGTH &&
    descriptor.every((value) => typeof value === 'number' && Number.isFinite(value));
}

function descriptorToBuffer(descriptor) {
  if (!isValidDescriptor(descriptor)) {
    throw new Error(`Descriptor facial deve conter exatamente ${DESCRIPTOR_LENGTH} números válidos.`);
  }

  const buffer = Buffer.alloc(DESCRIPTOR_BYTES);

  descriptor.forEach((value, index) => {
    buffer.writeFloatLE(value, index * FLOAT_BYTES);
  });

  return buffer;
}

function bufferToDescriptor(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value || []);

  if (buffer.length !== DESCRIPTOR_BYTES) {
    throw new Error(`Descriptor armazenado deve ter ${DESCRIPTOR_BYTES} bytes.`);
  }

  const descriptor = [];

  for (let offset = 0; offset < buffer.length; offset += FLOAT_BYTES) {
    descriptor.push(buffer.readFloatLE(offset));
  }

  return descriptor;
}

function findBestMatch(targetDescriptor, candidates, threshold = 0.6) {
  if (!isValidDescriptor(targetDescriptor)) {
    throw new Error('Descriptor alvo inválido.');
  }

  let bestMatch = null;

  for (const candidate of candidates) {
    const distance = euclideanDistance(targetDescriptor, candidate.descriptor);

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = {
        ...candidate,
        distance,
        confidence: calculateConfidence(distance, threshold),
        isMatch: isMatch(distance, threshold),
      };
    }
  }

  return bestMatch;
}

module.exports = {
  DESCRIPTOR_BYTES,
  DESCRIPTOR_LENGTH,
  bufferToDescriptor,
  calculateConfidence,
  descriptorToBuffer,
  euclideanDistance,
  findBestMatch,
  isMatch,
  isValidDescriptor,
};
