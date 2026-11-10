// Products, their lots and the "use first" flag (FR-03, FR-04, FR-05).
const express = require('express');
const { stockStatus, expiryTier, suggestedQuantity, todayDate } = require('../rules');

const STOCK_STATUSES = ['out', 'below', 'on', 'above'];

// One row per product with its stock (sum of lots) and soonest expiry date.
// "? = ''" means: if the filter is empty, this condition is always true.
const PRODUCTS_SQL = `
  SELECT p.id, p.code, p.name, p.category, p.unit_price AS unitPrice, p.recommended,
         COALESCE(SUM(l.quantity), 0) AS inStock,
         MIN(CASE WHEN l.quantity > 0 THEN l.expiry_date END) AS nextExpiry
  FROM products p
  LEFT JOIN lots l ON l.product_id = p.id
  WHERE (? = '' OR p.name LIKE ? OR p.code LIKE ?)
    AND (? = '' OR p.category = ?)
  GROUP BY p.id
  ORDER BY p.name`;

function createProductRoutes(db) {
  const router = express.Router();

  // FR-03: list products, filtered by search text, category and stock status.
  router.get('/products', (req, res) => {
    const search = String(req.query.search ?? '').trim();
    const category = String(req.query.category ?? '');
    const status = String(req.query.status ?? '');

    if (status !== '' && !STOCK_STATUSES.includes(status)) {
      res.status(400).json({ error: 'Unknown stock status.', fields: { status: 'Choose a valid status.' } });
      return;
    }

    const pattern = '%' + search + '%'; // SQLite LIKE ignores upper/lower case
    const rows = db.prepare(PRODUCTS_SQL).all(search, pattern, pattern, category, category);
    const products = rows.map(addStatusAndTier);
    // The status comes from rules.js, so we filter on it here instead of in SQL.
    const filtered = status === '' ? products : products.filter((p) => p.status === status);
    res.json(filtered);
  });

  // FR-04: one product with its lots (soonest expiry first) and the suggested order.
  router.get('/products/:id', (req, res) => {
    const product = db.prepare(
      'SELECT id, code, name, category, unit_price AS unitPrice, recommended FROM products WHERE id = ?'
    ).get(Number(req.params.id));
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const lots = findLots(db, product.id);
    const inStock = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    res.json({
      ...product,
      inStock,
      status: stockStatus(inStock, product.recommended),
      suggested: suggestedQuantity(inStock, product.recommended),
      lots,
    });
  });

  // FR-05: mark a lot as "use first" (or remove the mark).
  router.patch('/lots/:id', (req, res) => {
    const { useFirst } = req.body ?? {};
    if (typeof useFirst !== 'boolean') {
      res.status(400).json({ error: 'useFirst must be true or false.', fields: { useFirst: 'Must be true or false.' } });
      return;
    }

    const lotId = Number(req.params.id);
    const result = db.prepare('UPDATE lots SET use_first = ? WHERE id = ?').run(useFirst ? 1 : 0, lotId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Lot not found.' });
      return;
    }

    res.json(findLot(db, lotId));
  });

  return router;
}

// Add stock status and next-expiry tier (both from rules.js) to a product row.
function addStatusAndTier(product) {
  return {
    ...product,
    status: stockStatus(product.inStock, product.recommended),
    nextExpiryTier: product.nextExpiry ? expiryTier(product.nextExpiry, todayDate()) : null,
  };
}

// All lots of a product, soonest expiry first.
function findLots(db, productId) {
  const rows = db.prepare(
    `SELECT id, lot_number AS lotNumber, quantity, expiry_date AS expiryDate, use_first AS useFirst
     FROM lots WHERE product_id = ? ORDER BY expiry_date`
  ).all(productId);
  return rows.map(formatLot);
}

// One lot by id.
function findLot(db, lotId) {
  const row = db.prepare(
    `SELECT id, lot_number AS lotNumber, quantity, expiry_date AS expiryDate, use_first AS useFirst
     FROM lots WHERE id = ?`
  ).get(lotId);
  return formatLot(row);
}

// SQLite stores true/false as 1/0; the client gets a real boolean and the expiry tier.
function formatLot(lot) {
  return {
    ...lot,
    useFirst: lot.useFirst === 1,
    tier: expiryTier(lot.expiryDate, todayDate()),
  };
}

module.exports = { createProductRoutes };
