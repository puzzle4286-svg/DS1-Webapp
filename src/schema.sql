-- Smart Stock database tables (see README "Data model").
-- "IF NOT EXISTS" means running this file twice is safe.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  name          TEXT,
  email         TEXT UNIQUE,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY,
  code        TEXT UNIQUE,
  name        TEXT,
  category    TEXT,
  unit_price  REAL,
  recommended INTEGER
);

-- A lot is one batch of a product with its own expiry date.
-- Stock of a product = SUM(lots.quantity), never stored twice.
CREATE TABLE IF NOT EXISTS lots (
  id          INTEGER PRIMARY KEY,
  product_id  INTEGER REFERENCES products(id),
  lot_number  TEXT,
  quantity    INTEGER,
  expiry_date TEXT,
  use_first   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS requests (
  id         INTEGER PRIMARY KEY,
  type       TEXT CHECK(type IN ('replenishment', 'usage', 'return')),
  product_id INTEGER REFERENCES products(id),
  quantity   INTEGER,
  reason     TEXT,
  notes      TEXT,
  status     TEXT DEFAULT 'Submitted',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT,
  updated_at TEXT
);

-- Units that left storage without a usage report.
CREATE TABLE IF NOT EXISTS removals (
  id          INTEGER PRIMARY KEY,
  product_id  INTEGER REFERENCES products(id),
  quantity    INTEGER,
  detected_at TEXT,
  status      TEXT DEFAULT 'open',
  reason      TEXT,
  note        TEXT,
  explained_at TEXT
);
