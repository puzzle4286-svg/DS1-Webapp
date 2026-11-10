// Opens the SQLite database, creates the tables and loads the seed data.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./auth');

const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'data', 'seed.json');

// Open (or create) the database file. Use ':memory:' for tests.
function openDatabase(filePath) {
  const db = new DatabaseSync(filePath);
  db.exec('PRAGMA foreign_keys = ON');
  createTables(db);
  if (isEmpty(db)) {
    loadSeedData(db);
  }
  return db;
}

// Run schema.sql. It uses "IF NOT EXISTS", so existing data is kept.
function createTables(db) {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(schema);
}

// The database counts as empty when there are no users yet.
function isEmpty(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  return row.count === 0;
}

// Load data/seed.json. One transaction: either everything is saved or nothing.
function loadSeedData(db) {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  db.exec('BEGIN');
  try {
    const firstUserId = seedUsers(db, seed.users);
    seedProducts(db, seed.products);
    seedRequests(db, seed.requests, firstUserId);
    seedRemovals(db, seed.removals);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Insert users with hashed passwords. Returns the id of the first user.
function seedUsers(db, users) {
  const insert = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
  let firstUserId = null;
  for (const user of users) {
    const result = insert.run(user.name, user.email, hashPassword(user.password));
    if (firstUserId === null) {
      firstUserId = Number(result.lastInsertRowid);
    }
  }
  return firstUserId;
}

// Insert products and their lots. Each lot in the seed is [lotNumber, quantity, expiryDate].
function seedProducts(db, products) {
  const insertProduct = db.prepare(
    'INSERT INTO products (code, name, category, unit_price, recommended) VALUES (?, ?, ?, ?, ?)'
  );
  const insertLot = db.prepare(
    'INSERT INTO lots (product_id, lot_number, quantity, expiry_date) VALUES (?, ?, ?, ?)'
  );
  for (const product of products) {
    const result = insertProduct.run(
      product.code, product.name, product.category, product.unitPrice, product.recommended
    );
    const productId = Number(result.lastInsertRowid);
    for (const [lotNumber, quantity, expiryDate] of product.lots) {
      insertLot.run(productId, lotNumber, quantity, expiryDate);
    }
  }
}

// Insert example requests. The seed names products by code, so we look up the id.
function seedRequests(db, requests, userId) {
  const insert = db.prepare(
    `INSERT INTO requests (type, product_id, quantity, reason, notes, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const request of requests) {
    insert.run(
      request.type, findProductId(db, request.productCode), request.quantity,
      request.reason, request.notes, request.status, userId, request.createdAt, request.createdAt
    );
  }
}

// Insert example removals (some open, some already explained).
function seedRemovals(db, removals) {
  const insert = db.prepare(
    `INSERT INTO removals (product_id, quantity, detected_at, status, reason, note, explained_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const removal of removals) {
    const explainedAt = removal.status === 'explained' ? removal.detectedAt : null;
    insert.run(
      findProductId(db, removal.productCode), removal.quantity, removal.detectedAt,
      removal.status, removal.reason ?? null, removal.note ?? null, explainedAt
    );
  }
}

// Look up a product id by its code. Throws if the seed file has a typo.
function findProductId(db, code) {
  const row = db.prepare('SELECT id FROM products WHERE code = ?').get(code);
  if (!row) {
    throw new Error('Seed data refers to unknown product code: ' + code);
  }
  return row.id;
}

module.exports = { openDatabase };
