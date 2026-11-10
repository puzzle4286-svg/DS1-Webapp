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

// FR-01: middleware that lets a request through only when someone is signed in.
// The login route stores userId in the session; without it we answer 401.
function requireLogin(req, res, next) {
  if (req.session.userId) {
    next();
    return;
  }
  res.status(401).json({ error: 'Please sign in.' });
}

module.exports = { hashPassword, checkPassword, requireLogin };
