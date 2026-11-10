// Builds the Express app. server.js starts it; tests pass their own database.
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { requireLogin } = require('./auth');
const { createAuthRoutes } = require('./routes/auth');
const { createDashboardRoutes } = require('./routes/dashboard');
const { createProductRoutes } = require('./routes/products');
const { createRemovalRoutes } = require('./routes/removals');

const PUBLIC_FOLDER = path.join(__dirname, '..', 'public');
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';

function createApp(db) {
  const app = express();

  // Read JSON request bodies into req.body.
  app.use(express.json());

  // Login session: the browser gets a cookie, the server remembers who it belongs to.
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  }));

  // Serve the frontend files (HTML, CSS, JS) from public/.
  app.use(express.static(PUBLIC_FOLDER));

  // Infrastructure (no FR): quick check that the server is running. Public on purpose.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // FR-01: login, logout, me. Login is the only route that works without a session.
  app.use('/api/auth', createAuthRoutes(db));

  // FR-01: every other /api route needs a signed-in user.
  app.use('/api', requireLogin);

  // Routes below only run for signed-in users.
  app.use('/api', createDashboardRoutes(db));
  app.use('/api', createProductRoutes(db));
  app.use('/api', createRemovalRoutes(db));

  return app;
}

module.exports = { createApp };
