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

module.exports = {
  signJwt,
};
