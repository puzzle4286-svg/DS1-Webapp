// Dashboard: what needs attention today (FR-02).
const express = require('express');
const { stockStatus, expiryTier, todayDate } = require('../rules');

const NEAREST_LOTS = 5;
const LATEST_REQUESTS = 3;

function createDashboardRoutes(db) {
  const router = express.Router();

  // FR-02: four KPIs, the 5 lots that expire soonest and the 3 newest requests.
  router.get('/dashboard', (req, res) => {
    const today = todayDate();
    const lots = findLotsInStock(db);
    const products = findStockPerProduct(db);

    res.json({
      unitsInStock: lots.reduce((sum, lot) => sum + lot.quantity, 0),
      expiringLots: lots.filter((lot) => expiryTier(lot.expiryDate, today) === 'critical').length,
      // Out of stock is also below the recommendation, so both count here.
      productsBelow: products.filter((p) => isBelow(stockStatus(p.inStock, p.recommended))).length,
      openRemovals: countOpenRemovals(db),
      nearestExpiry: lots.slice(0, NEAREST_LOTS).map((lot) => ({
        ...lot, tier: expiryTier(lot.expiryDate, today),
      })),
      latestRequests: findLatestRequests(db),
    });
  });

  return router;
}

function isBelow(status) {
  return status === 'out' || status === 'below';
}

// Lots that still have units, soonest expiry first, with their product name.
function findLotsInStock(db) {
  return db.prepare(
    `SELECT l.id, l.product_id AS productId, p.name AS productName, l.lot_number AS lotNumber,
            l.quantity, l.expiry_date AS expiryDate
     FROM lots l JOIN products p ON p.id = l.product_id
     WHERE l.quantity > 0
     ORDER BY l.expiry_date`
  ).all();
}

// Stock (sum of lots) and recommendation for every product, also those without lots.
function findStockPerProduct(db) {
  return db.prepare(
    `SELECT p.id, p.recommended, COALESCE(SUM(l.quantity), 0) AS inStock
     FROM products p LEFT JOIN lots l ON l.product_id = p.id
     GROUP BY p.id`
  ).all();
}

function countOpenRemovals(db) {
  return db.prepare("SELECT COUNT(*) AS count FROM removals WHERE status = 'open'").get().count;
}

// The newest requests with their product name.
function findLatestRequests(db) {
  return db.prepare(
    `SELECT r.id, r.type, r.product_id AS productId, p.name AS productName,
            r.quantity, r.status, r.created_at AS createdAt
     FROM requests r JOIN products p ON p.id = r.product_id
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT ?`
  ).all(LATEST_REQUESTS);
}

module.exports = { createDashboardRoutes };
