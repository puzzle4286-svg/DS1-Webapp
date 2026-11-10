# Prompts for Claude Code (build in small, reviewable increments)

Use the course loop for **every** step: **Prompt → Inspect → Run → Explain**.
After each step: read the diff, run the commands listed under "Check", commit with Git, and fill one entry in `docs/PROMPT_LOG.md`. Don't paste the next prompt before the current one works.

> The slides name Codex as the course AI tool. Confirm with Dr. Georges that Claude Code is acceptable. These prompts work in either tool.

---

## Step 0 — Context (paste once at the start of the session)
```
You are helping me build a university course project (Digital Systems 1).
Read README.md and BUSINESS_CASE.md in this folder first. They are the specification.
Annotated wireframes: design/Smart Stock Wireframes.dc.html (turn 2, screens S1–S7).
Constraints for ALL steps:
- Node.js 24, plain JavaScript (CommonJS), Express 5, node:sqlite, express-session, plain HTML/CSS/JS frontend with fetch. No TypeScript, no React, no build tools, no other npm packages unless I approve.
- Code must be easy to read for a beginner: short functions, clear names, a one-line comment above each route naming its requirement (FR-xx).
- Do only the step I ask for. List the files you changed and how I can check it works.
Reply with a short plan for step 1 only, don't write code yet.
```

## Step 1 — Project skeleton + database
```
Step 1: create package.json (scripts: start, dev with node --watch, test with node --test, reset-db),
server.js, src/app.js, src/db.js, src/schema.sql exactly as in README "Data model".
db.js exports openDatabase(filePath): creates tables if missing and loads data/seed.json if the users table is empty.
Seed passwords must be hashed with scrypt from node:crypto (put hashPassword/checkPassword in src/auth.js).
app.js exports createApp(db) so tests can pass an in-memory database (':memory:').
Serve the public/ folder statically. Add GET /api/health returning {ok:true}.
Acceptance: npm start prints the URL; http://localhost:3000/api/health returns {"ok":true}; data/smartstock.db exists and has 10 products.
```
**Check:** `npm install` · `npm start` · open `/api/health` · stop and restart the server, then confirm the data is still there.

## Step 2 — Business rules + validation with unit tests
```
Step 2: create src/rules.js (stockStatus, expiryTier, suggestedQuantity, canChangeRequest) and
src/validation.js (validateRequest, validateExplanation) exactly as described in README.
Each function returns plain values; validators return an object of field errors ({} when valid).
Write tests/rules.test.js and tests/validation.test.js with node:test covering every branch,
including boundaries: quantity 0, 1, 100, 101, 2.5, "abc"; expiry exactly 90 and 91 days; stock exactly 1.15 × recommended.
Acceptance: npm test passes; tests U1–U4 and V1–V5 from TESTING.md exist.
```
**Check:** `npm test`. Then change one rule on purpose (e.g. 90 → 60), confirm a test fails, and undo the change. Screenshot this for your video.

## Step 3 — Login + session
```
Step 3: implement FR-01. Routes in src/routes/auth.js: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me.
Middleware requireLogin in src/auth.js returns 401 {error:"Please sign in."} for /api routes.
Never send password_hash to the client. Use express-session with a secret from process.env.SESSION_SECRET or a dev default.
Add tests A1–A3 in tests/api.test.js using supertest with an in-memory database.
```
**Check:** `npm test` · try login with the wrong password in `requests.http`.

## Step 4 — Read APIs (dashboard, products, lots, removals list)
```
Step 4: implement FR-02, FR-03, FR-04, FR-05, FR-10 API routes from the README table (dashboard, products list + detail, PATCH lots/:id, GET removals).
Use rules.js for status/tier/suggested — do not duplicate the logic in SQL.
Add tests A4–A8 and A16. Create requests.http with one example call per route.
```

## Step 5 — Requests CRUD + removal explanation API
```
Step 5: implement FR-06 to FR-09 and FR-11: GET/POST/PUT/DELETE /api/requests and PATCH /api/removals/:id.
Order inside each route: check input with validation.js → 400 with fields; load row → 404; check canChangeRequest → 409; write; respond (201 for create, 204 for delete).
Add a central error handler in app.js (500, logs the error, generic message to client).
Add tests A9–A15, A17–A18 covering success AND failure cases.
```
**Check:** `npm test` · run the whole CRUD roundtrip with `requests.http`. Look at the database before and after (VS Code "SQLite Viewer" extension, or `sqlite3 data/smartstock.db`).

## Step 6 — Frontend pages
```
Step 6: build the 7 pages in public/ following the annotated wireframes S1–S7 (turn 2) and the visual style in README.
public/js/api.js: api(method, url, body) using fetch; parses JSON; on 401 redirects to login.html; throws an Error with .fields for 400.
Also renderHeader(activePage) for the shared nav. One small JS file per page.
Every page: loading text, empty state, red error banner with "Try again", green success message passed via ?msg= in the URL.
Request form: same validation rules in the browser as the server, messages under each field, button disabled while saving; supports ?id= (edit) and ?type=&productId=&quantity= (prefill).
Use the logo from design/assets/bentley-logo.png (copy it to public/img/). Keep public/css/style.css under ~250 lines.
```
**Check:** click through the manual test script M1–M8 in TESTING.md.

## Step 7 — Review and clean-up
```
Step 7: review the whole project as a strict code reviewer. List (don't fix yet):
duplicated code, missing error handling, inconsistencies between README, BUSINESS_CASE.md and the implementation,
security issues, and anything a beginner would find hard to explain. Then wait for my decision.
```
Pick which findings to fix, and write down what you rejected and why. This is the "documented decisions and rejected alternatives" evidence for the AI-workflow criterion.

---

## Writing your own follow-up prompts (when something breaks)
Good prompts include **context, the exact error, expected vs. actual, constraints, acceptance criteria**:
```
Test A13 fails: PUT /api/requests/11 returns 200 but should return 409 because status is 'Approved'.
Output: <paste npm test output>
Expected: 409 {error:"This request can no longer be changed."}
Fix only src/routes/requests.js. Explain the cause in two sentences before changing code.
```
