// Unreported removals: units that left storage without a usage report (FR-10).
const express = require('express');

const REMOVAL_STATUSES = ['open', 'explained'];

function createRemovalRoutes(db) {
  const router = express.Router();

  // FR-10: list removals, optionally only open or only explained, newest first.
  router.get('/removals', (req, res) => {
    const status = String(req.query.status ?? '');
    if (status !== '' && !REMOVAL_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Unknown removal status.', fields: { status: 'Use open or explained.' } });
      return;
    }

    const removals = db.prepare(
      `SELECT r.id, r.product_id AS productId, p.code AS productCode, p.name AS productName,
              r.quantity, r.detected_at AS detectedAt, r.status, r.reason, r.note,
              r.explained_at AS explainedAt
       FROM removals r JOIN products p ON p.id = r.product_id
       WHERE (? = '' OR r.status = ?)
       ORDER BY r.detected_at DESC, r.id DESC`
    ).all(status, status);
    res.json(removals);
  });

  return router;
}

module.exports = { createRemovalRoutes };
