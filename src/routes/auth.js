// Sign in, sign out and "who am I" (FR-01).
const express = require('express');
const { checkPassword, requireLogin } = require('../auth');

const WRONG_LOGIN_MESSAGE = 'Email or password is incorrect.';

function createAuthRoutes(db) {
  const router = express.Router();

  // FR-01: sign in with email + password and start a session.
  router.post('/login', (req, res, next) => {
    const { email, password } = req.body ?? {};

    const fields = validateLogin(email, password);
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: 'Please fill in email and password.', fields });
      return;
    }

    const user = db.prepare('SELECT id, name, password_hash FROM users WHERE email = ?')
      .get(email.trim().toLowerCase());
    // Same message for unknown email and wrong password, so nobody can guess which emails exist.
    if (!user || !checkPassword(password, user.password_hash)) {
      res.status(401).json({ error: WRONG_LOGIN_MESSAGE });
      return;
    }

    // New session id after login, so an old (possibly stolen) id can't be reused.
    req.session.regenerate((error) => {
      if (error) {
        next(error);
        return;
      }
      req.session.userId = user.id;
      // Only id and name go to the client, never password_hash (NFR-03).
      res.json({ id: user.id, name: user.name });
    });
  });

  // FR-01: sign out and end the session.
  router.post('/logout', requireLogin, (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      res.clearCookie('connect.sid');
      res.status(204).end();
    });
  });

  // FR-01: the frontend asks who is signed in (401 if nobody).
  router.get('/me', requireLogin, (req, res) => {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?')
      .get(req.session.userId);
    if (!user) {
      res.status(401).json({ error: 'Please sign in.' });
      return;
    }
    res.json(user);
  });

  return router;
}

// Both fields must be non-empty text. Returns field errors ({} when valid).
function validateLogin(email, password) {
  const fields = {};
  if (typeof email !== 'string' || email.trim() === '') {
    fields.email = 'Enter your email.';
  }
  if (typeof password !== 'string' || password === '') {
    fields.password = 'Enter your password.';
  }
  return fields;
}

module.exports = { createAuthRoutes };
