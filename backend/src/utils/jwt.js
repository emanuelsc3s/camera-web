const jsonwebtoken = require('jsonwebtoken');

function signJwt(payload, secret, options = {}) {
  if (!secret) {
    return null;
  }

  return jsonwebtoken.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: options.expiresIn || '8h',
  });
}

function verifyJwt(token, secret) {
  if (!secret) {
    return null;
  }

  return jsonwebtoken.verify(token, secret, {
    algorithms: ['HS256'],
  });
}

module.exports = {
  signJwt,
  verifyJwt,
};
