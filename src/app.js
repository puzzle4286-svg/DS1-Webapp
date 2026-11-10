// Builds the Express app. server.js starts it; tests pass their own database.
const path = require('node:path');
const express = require('express');

const PUBLIC_FOLDER = path.join(__dirname, '..', 'public');

function createApp(db) {
  const app = express();

  // Read JSON request bodies into req.body.
  app.use(express.json());

  // Serve the frontend files (HTML, CSS, JS) from public/.
  app.use(express.static(PUBLIC_FOLDER));

  // Infrastructure (no FR): quick check that the server is running.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

module.exports = { createApp };
