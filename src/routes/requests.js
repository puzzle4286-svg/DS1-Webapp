// Requests to Bentley: the full CRUD roundtrip (FR-06, FR-07, FR-08, FR-09).
const express = require('express');
const { validateRequest, REQUEST_TYPES } = require('../validation');
const { canChangeRequest } = require('../rules');

const REQUEST_STATUSES = ['Submitted', 'Approved', 'Rejected', 'Completed'];
const LOCKED_MESSAGE = 'This request can no longer be changed.';

// Shared SELECT: a request with its product's code and name.
const SELECT_REQUEST = `
  SELECT r.id, r.type, r.product_id AS productId, p.code AS productCode, p.name AS productName,
         r.quantity, r.reason, r.notes, r.status, r.created_by AS createdBy,
         r.created_at AS createdAt, r.updated_at AS updatedAt
  FROM requests r JOIN products p ON p.id = r.product_id`;

function createRequestRoutes(db) {
  const router = express.Router();

  // FR-07: list requests, newest first, optionally filtered by status and type.
  router.get('/requests', (req, res) => {
    const status = String(req.query.status ?? '');
    const type = String(req.query.type ?? '');

    const fields = validateListFilters(status, type);
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: 'Unknown filter value.', fields });
      return;
    }

    const requests = db.prepare(
      `${SELECT_REQUEST}
       WHERE (? = '' OR r.status = ?) AND (? = '' OR r.type = ?)
       ORDER BY r.created_at DESC, r.id DESC`
    ).all(status, status, type, type);
    res.json(requests);
  });

  // FR-07, FR-08: one request (the edit form loads it with this).
  router.get('/requests/:id', (req, res) => {
    const request = findRequest(db, req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    res.json(request);
  });

  // FR-06: create a request. It always starts with status Submitted.
  // FR-11: a usage report can also resolve an open removal ("Report usage" on S7),
  // when the form sends the removal's id as removalId.
  router.post('/requests', (req, res) => {
    const input = req.body ?? {};
    const fields = checkRequestInput(db, input);
    if (input.removalId !== undefined) {
      Object.assign(fields, checkRemovalLink(db, input));
    }
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: 'Please correct the marked fields.', fields });
      return;
    }

    const removal = input.removalId === undefined ? null : findRemovalStatus(db, input.removalId);
    if (removal && removal.status !== 'open') {
      res.status(409).json({ error: 'This removal has already been explained.' });
      return;
    }

    // One transaction: the request and the removal are saved together, or not at all.
    db.exec('BEGIN');
    try {
      const requestId = insertRequest(db, input, req.session.userId);
      if (removal) {
        explainRemovalAsUsage(db, removal.id, requestId);
      }
      db.exec('COMMIT');
      res.status(201).json(findRequest(db, requestId));
    } catch (error) {
      db.exec('ROLLBACK');
      throw error; // goes to the central error handler (500)
    }
  });

  // FR-08: edit a request, only while it is still Submitted.
  router.put('/requests/:id', (req, res) => {
    const input = req.body ?? {};
    const fields = checkRequestInput(db, input);
    if (Object.keys(fields).length > 0) {
      res.status(400).json({ error: 'Please correct the marked fields.', fields });
      return;
    }

    const existing = findRequest(db, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    if (!canChangeRequest(existing.status)) {
      res.status(409).json({ error: LOCKED_MESSAGE });
      return;
    }

    db.prepare(
      `UPDATE requests SET type = ?, product_id = ?, quantity = ?, reason = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.type, input.productId, input.quantity, cleanText(input.reason), cleanText(input.notes),
      new Date().toISOString(), existing.id
    );

    res.json(findRequest(db, existing.id));
  });

  // FR-09: withdraw (delete) a request, only while it is still Submitted.
  router.delete('/requests/:id', (req, res) => {
    const existing = findRequest(db, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    if (!canChangeRequest(existing.status)) {
      res.status(409).json({ error: LOCKED_MESSAGE });
      return;
    }

    db.prepare('DELETE FROM requests WHERE id = ?').run(existing.id);
    res.status(204).end();
  });

  return router;
}

// Save a new request with status Submitted. Returns its id.
function insertRequest(db, input, userId) {
  const now = new Date().toISOString();
  const result = db.prepare(
    `INSERT INTO requests (type, product_id, quantity, reason, notes, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'Submitted', ?, ?, ?)`
  ).run(
    input.type, input.productId, input.quantity, cleanText(input.reason), cleanText(input.notes),
    userId, now, now
  );
  return Number(result.lastInsertRowid);
}

// A removal can only be resolved by a usage report, and the removal must exist.
function checkRemovalLink(db, input) {
  const fields = {};
  if (input.type !== 'usage') {
    fields.type = 'Only a usage report can resolve a removal.';
  }
  if (!findRemovalStatus(db, input.removalId)) {
    fields.removalId = 'Unknown removal.';
  }
  return fields;
}

function findRemovalStatus(db, removalId) {
  return db.prepare('SELECT id, status FROM removals WHERE id = ?').get(Number(removalId));
}

// Mark the removal as explained, pointing to the usage request that accounts for it.
function explainRemovalAsUsage(db, removalId, requestId) {
  db.prepare(
    "UPDATE removals SET status = 'explained', reason = ?, note = ?, explained_at = ? WHERE id = ?"
  ).run('Used in procedure', `Reported as usage request #${requestId}`, new Date().toISOString(), removalId);
}

// One request by id, or undefined if there is none.
function findRequest(db, id) {
  return db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).get(Number(id));
}

// validation.js checks the fields; only the route can check the product exists in the database.
function checkRequestInput(db, input) {
  const fields = validateRequest(input);
  if (!fields.productId && !productExists(db, input.productId)) {
    fields.productId = 'Choose a product.';
  }
  return fields;
}

function productExists(db, productId) {
  return db.prepare('SELECT id FROM products WHERE id = ?').get(productId) !== undefined;
}

// Filters must be empty or a known value.
function validateListFilters(status, type) {
  const fields = {};
  if (status !== '' && !REQUEST_STATUSES.includes(status)) {
    fields.status = 'Choose a valid status.';
  }
  if (type !== '' && !REQUEST_TYPES.includes(type)) {
    fields.type = 'Choose a valid type.';
  }
  return fields;
}

// Optional text fields: trimmed, and '' when missing.
function cleanText(text) {
  return typeof text === 'string' ? text.trim() : '';
}

module.exports = { createRequestRoutes };
