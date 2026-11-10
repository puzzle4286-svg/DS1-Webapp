# Bentley Smart Stock — course project handoff (Digital Systems 1)

This folder holds everything needed to build **Smart Stock** as a small Node.js web app that meets the DS1 brief: *"a web app with Node.js, HTML/CSS, and data storage"*, with a complete **CRUD roundtrip from frontend to backend**.

Start with **SETUP.md**. It gives the steps in order.

| File | What it is | Rubric criterion |
|---|---|---|
| `SETUP.md` | Step-by-step: install tools, build with Claude Code, run, test, record | all |
| `BUSINESS_CASE.md` | Problem, users, process, measurable outcome, requirements FR-01…FR-11 with acceptance criteria | 1 · Business case (10%) |
| `design/Smart Stock Wireframes.dc.html` | **Turn 2 = annotated wireframes of the 7 screens you build.** Turn 1 = full product vision (not built) | 1 · Business case |
| `CLAUDE_CODE_PROMPTS.md` | 7 small, reviewable prompts with context, constraints and acceptance criteria | 4 · AI workflow (20%) |
| `TESTING.md` | Automated tests, API checks, manual test script | 5 · Code understanding (25%) |
| `PROMPT_LOG.md` | Template: record every prompt, what you checked, what you changed | 4 · AI workflow |
| `EXPLAIN_BACK.md` | Template using the course's six questions for your key code | 5 · Code understanding, 6 · Video |
| `data/seed.json` | Sample clinic data loaded into the database on first start | 3 · Technical |
| `design/Smart Stock.dc.html` | Hi-fi prototype of the full vision. Visual reference only (look, colours, wording) | — |

## Scope (deliberately small)

The hi-fi prototype has 14 screens. The course app has **7**, chosen so every part can be explained in a 10-minute video:

1. Sign in
2. Dashboard
3. Inventory (search + filter)
4. Product detail (lots, "use first")
5. Requests list
6. Request form (create + edit)
7. Unreported removals (explain)

**The CRUD roundtrip lives on `requests`:** create (form), read (list + detail), update (edit while status = Submitted), delete (withdraw while Submitted). Two further updates (lot "use first", removal explanation) show the same pattern again.

**Out of scope:** RFID hardware/simulator, incentives, reports/charts, notifications, user management, settings, roles. Mention them in the video as "future work". The prototype shows them.

## Technology (matches the slides: Node.js, Express, HTML/CSS, data storage)

- **Node.js 24 LTS** with plain JavaScript (CommonJS `require`), no TypeScript, no build step
- **Express 5**: REST API + serves the frontend files (course Part Three)
- **SQLite** via Node's built-in `node:sqlite` module: one file `data/smartstock.db`, no install, no Docker
- **express-session**: login session cookie. Passwords hashed with built-in `node:crypto` (scrypt)
- **Frontend**: plain HTML pages + one CSS file + small JS files using `fetch()` (course Part Four). No React, no framework
- **Tests**: built-in `node:test` + `supertest`
- **Only 3 npm dependencies**: `express`, `express-session`, `supertest` (dev)

## Architecture

```
Browser (public/*.html + js/*.js)
   │  fetch('/api/…')  JSON
   ▼
Express app (src/app.js)
   ├─ routes/*.js      ← reads request, calls validation + db, sends JSON + status code
   ├─ validation.js    ← checks input, returns list of field errors
   ├─ rules.js         ← business rules (stock status, expiry tier, suggested order)
   └─ db.js            ← opens SQLite, creates tables, loads seed data
   ▼
data/smartstock.db (SQLite file)
```

## Folder structure to create

```
smart-stock/
  package.json            scripts: start, dev, test, reset-db
  server.js               starts the app on port 3000
  src/
    app.js                creates Express app, mounts routes, error handler (exported for tests)
    db.js                 openDatabase(file) → creates tables + seeds if empty
    schema.sql            CREATE TABLE statements
    rules.js              stockStatus(), expiryTier(), suggestedQuantity()
    validation.js         validateRequest(), validateExplanation()
    auth.js               hashPassword(), checkPassword(), requireLogin middleware
    routes/
      auth.js  dashboard.js  products.js  requests.js  removals.js
  public/
    login.html  index.html  inventory.html  product.html
    requests.html  request-form.html  removals.html
    css/style.css
    js/api.js             one helper: api(method, url, body) → handles JSON, errors, 401 redirect
    js/<page>.js          one small file per page
    img/bentley-logo.png
  data/seed.json
  tests/
    rules.test.js  validation.test.js  api.test.js
  requests.http           ready-made API calls for manual testing
  docs/                   BUSINESS_CASE.md, PROMPT_LOG.md, EXPLAIN_BACK.md, wireframes
```

## Data model (SQLite)

```sql
users     (id INTEGER PK, name TEXT, email TEXT UNIQUE, password_hash TEXT)
products  (id INTEGER PK, code TEXT UNIQUE, name TEXT, category TEXT,
           unit_price REAL, recommended INTEGER)
lots      (id INTEGER PK, product_id → products, lot_number TEXT,
           quantity INTEGER, expiry_date TEXT, use_first INTEGER DEFAULT 0)
requests  (id INTEGER PK, type TEXT CHECK(type IN ('replenishment','usage','return')),
           product_id → products, quantity INTEGER, reason TEXT, notes TEXT,
           status TEXT DEFAULT 'Submitted', created_by → users,
           created_at TEXT, updated_at TEXT)
removals  (id INTEGER PK, product_id → products, quantity INTEGER, detected_at TEXT,
           status TEXT DEFAULT 'open', reason TEXT, note TEXT, explained_at TEXT)
```

The stock of a product is `SUM(lots.quantity)`. It's calculated, never stored twice.

## Business rules (`src/rules.js`, pure functions, unit-tested)

- `stockStatus(inStock, recommended)` → `'out'` if 0 · `'below'` if < recommended · `'above'` if > recommended × 1.15 · else `'on'`
- `expiryTier(expiryDate, today)` → `'critical'` ≤ 90 days · `'warning'` ≤ 180 days · else `'ok'` (expired counts as critical)
- `suggestedQuantity(inStock, recommended)` → `max(0, recommended − inStock)`
- A request can be edited or deleted **only while status = 'Submitted'** (otherwise 409)

## REST API

All routes except login return **401** without a session. Errors are always `{ "error": "message", "fields": { "quantity": "…" } }`.

| Method | URL | Purpose | Success | Errors |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` → start session | 200 `{id,name}` | 400, 401 |
| POST | `/api/auth/logout` | end session | 204 | |
| GET | `/api/auth/me` | current user | 200 | 401 |
| GET | `/api/dashboard` | 4 KPIs, 5 nearest-expiry lots, 3 newest requests | 200 | |
| GET | `/api/products?search=&category=&status=` | list with inStock, recommended, status, nextExpiry | 200 | |
| GET | `/api/products/:id` | product + lots (sorted by expiry) + suggested | 200 | 404 |
| PATCH | `/api/lots/:id` | `{useFirst: true/false}` | 200 | 400, 404 |
| GET | `/api/requests?status=&type=` | list, newest first | 200 | |
| GET | `/api/requests/:id` | one request | 200 | 404 |
| POST | `/api/requests` | create | **201** + new object | 400 |
| PUT | `/api/requests/:id` | update | 200 | 400, 404, 409 |
| DELETE | `/api/requests/:id` | withdraw | **204** | 404, 409 |
| GET | `/api/removals?status=open\|explained` | list | 200 | |
| PATCH | `/api/removals/:id` | `{reason, note}` → status explained | 200 | 400, 404, 409 |

## Validation (server is the source of truth, browser checks the same rules first)

- **Request:** `type` one of replenishment/usage/return · `productId` exists · `quantity` integer 1–100 · `reason` required for usage and return · `notes` ≤ 500 chars
- **Removal explanation:** `reason` one of *Used in procedure / Damaged / Moved to other room / Other* · `note` required if Other · `note` ≤ 300 chars

## Code style rules (keep it explainable)

- Short functions with clear names, `async/await`, no clever one-liners
- One comment above each route explaining *what business need it serves* (FR number)
- SQL written out in plain prepared statements (`db.prepare('SELECT …').all(...)`), never string-concatenated user input
- Every route: validate → query → respond. Unexpected errors go to one central error handler (500 + log)
- No duplicated HTML header: `js/api.js` also renders the shared nav

## Visual style (from the prototype)

Fonts: Cormorant Garamond (headings), Lora (body) from Google Fonts. Background `#f3f2f2`, text `#201f1d`, borders `rgba(32,31,29,.16)`, accent blue `#0391d1` (logo `#04aaf4`, accent text `#02699a`). Tags: critical `#f8e1dd`/`#861b11`, warning `#fbefd9`/`#6e4309`, ok `#e6f6fe`/`#03557b`. Outlined buttons, thin borders, 4px corners. Keep CSS in one file, ~200 lines.
