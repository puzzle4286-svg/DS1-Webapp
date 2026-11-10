// Unreported removals: units that left storage without a usage report (FR-10, FR-11).
const express = require('express');
const { validateExplanation } = require('../validation');

const REMOVAL_STATUSES = ['open', 'explained'];

// Shared SELECT: a removal with its product's code and name.
const SELECT_REMOVAL = `
  SELECT r.id, r.product_id AS productId, p.code AS productCode, p.name AS productName,
         r.quantity, r.detected_at AS detectedAt, r.status, r.reason, r.note,
         r.explained_at AS explainedAt
  FROM removals r JOIN products p ON p.id = r.product_id`;

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
      `${SELECT_REMOVAL}
       WHERE (? = '' OR r.status = ?)
       ORDER BY r.detected_at DESC, r.id DESC`
    ).all(status, status);
    res.json(removals);
  });

  // FR-11: explain an open removal. Afterwards it counts as explained.
  router.patch('/removals/:id', (req, res) => {
    const input = req.body ?? {};
    const fields = validateExplanation(input);
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: 'Please correct the marked fields.', fields });
      return;
    }

    const removal = findRemoval(db, req.params.id);
    if (!removal) {
      res.status(404).json({ error: 'Removal not found.' });
      return;
    }
    if (removal.status !== 'open') {
      res.status(409).json({ error: 'This removal has already been explained.' });
      return;
    }

    const note = typeof input.note === 'string' ? input.note.trim() : '';
    db.prepare(
      "UPDATE removals SET status = 'explained', reason = ?, note = ?, explained_at = ? WHERE id = ?"
    ).run(input.reason, note, new Date().toISOString(), removal.id);

    res.json(findRemoval(db, removal.id));
  });

  return router;
}

// One removal by id, or undefined if there is none.
function findRemoval(db, id) {
  return db.prepare(`${SELECT_REMOVAL} WHERE r.id = ?`).get(Number(id));
}

module.exports = { createRemovalRoutes };
