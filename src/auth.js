// Password hashing with scrypt from Node's built-in crypto module (NFR-03).
// We never store the plain password, only "salt:hash".
const crypto = require('node:crypto');

const KEY_LENGTH = 64;

// Turn a plain password into "salt:hash" for the database.
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return salt + ':' + hash;
}

// Check a plain password against a stored "salt:hash". Returns true or false.
function checkPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH);
  // timingSafeEqual compares in constant time, so attackers can't guess by timing.
  return crypto.timingSafeEqual(expected, actual);
}

module.exports = { hashPassword, checkPassword };
