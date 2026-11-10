# Testing Smart Stock

Three layers of testing. Each test ID links back to a requirement in `BUSINESS_CASE.md`.

| Layer | Tool | Command | What it proves |
|---|---|---|---|
| Unit tests | `node:test` | `npm test` | Business rules and validation are correct, including edge cases |
| API tests | `node:test` + `supertest`, in-memory SQLite | `npm test` | Each route returns the right status code and data, for success **and** failure |
| Manual / end-to-end | browser + checklist below | `npm start` | The full roundtrip works from the UI to the database and back |
| Ad-hoc API calls | `requests.http` (VS Code "REST Client" extension) or `curl` | — | Lets you show raw requests/responses in the video |

## 1. Unit tests (`tests/rules.test.js`, `tests/validation.test.js`)
| ID | Function | Cases |
|---|---|---|
| U1 | `stockStatus` | (0,10) → out · (9,10) → below · (10,10) → on · (11.5,10) → on · (12,10) → above |
| U2 | `expiryTier` | +90 days → critical · +91 → warning · +180 → warning · +181 → ok · −1 (expired) → critical |
| U3 | `suggestedQuantity` | (14,24) → 10 · (30,24) → 0 |
| U4 | `canChangeRequest` | Submitted → true · Approved/Completed/Rejected → false |
| V1 | `validateRequest` quantity | 0, 101, 2.5, "abc", missing → error · 1, 100 → ok |
| V2 | `validateRequest` type | "order" → error · replenishment/usage/return → ok |
| V3 | `validateRequest` reason | usage/return without reason → error · replenishment without → ok |
| V4 | `validateRequest` notes | 501 chars → error · 500 → ok |
| V5 | `validateExplanation` | missing reason → error · "Other" without note → error · note 301 chars → error |

## 2. API tests (`tests/api.test.js`)
Each test creates a fresh app with `createApp(openDatabase(':memory:'))`, so tests never touch your real data. A `supertest.agent` logs in once and keeps the cookie.

| ID | Request | Expected |
|---|---|---|
| A1 | POST /api/auth/login correct | 200, body has `name`, **no** `password_hash` |
| A2 | POST /api/auth/login wrong password | 401 |
| A3 | GET /api/products without login | 401 |
| A4 | GET /api/dashboard | 200, `openRemovals` equals rows with status open in seed |
| A5 | GET /api/products?search=des | only products whose name/code contains "des" |
| A6 | GET /api/products?status=below | every item has status below |
| A7 | GET /api/products/999 | 404 |
| A8 | PATCH /api/lots/1 `{useFirst:true}` then GET product | lot 1 has useFirst true |
| A9 | POST /api/requests valid | 201, status Submitted, id returned |
| A10 | POST /api/requests quantity 0 | 400, `fields.quantity` present, row count unchanged |
| A11 | GET /api/requests?status=Approved | only Approved |
| A12 | PUT /api/requests/:id (Submitted) | 200, quantity changed |
| A13 | PUT on an Approved request | 409 |
| A14 | DELETE Submitted request | 204, then GET → 404 |
| A15 | DELETE Approved request | 409, still exists |
| A16 | GET /api/removals?status=open | only open |
| A17 | PATCH /api/removals/:id valid | 200, status explained |
| A18 | PATCH same removal again | 409 |

Expected output of `npm test`: all tests pass, ≈ 35 tests, < 2 seconds.

## 3. Manual test script (do before recording the video)
Start fresh: `npm run reset-db` then `npm start` → http://localhost:3000. Login: `anna@stelisabeth.de` / `demo1234`.

| ID | Steps | Expected | ✓ |
|---|---|---|---|
| M1 | Open /inventory.html without login · log in with wrong password · log in correctly | Redirect to login · red error · dashboard | |
| M2 | Read dashboard numbers, compare with Inventory filters | Numbers match | |
| M3 | Inventory: type "becor" · filter Below · search "xyz" | Filtered rows · only below · empty state + Clear filters works | |
| M4 | Product → tick "use first" on a lot · reload page | Still ticked | |
| M5 | Product below target → Request replenishment · try quantity 0 · then 10 → Save | Form prefilled · error under field · list shows "Request #N created" at top | |
| M6 | Edit that request → quantity 12 → Save · check that Approved rows have no Edit | List shows 12 · no buttons on Approved | |
| M7 | Withdraw → Cancel · Withdraw → confirm | Nothing happens · row gone + message | |
| M8 | Removals → Explain → choose Other, empty note → Send · add note → Send | Note error · moves to Explained tab, open count −1 | |
| M9 | Stop server (Ctrl+C), start again | Data from M4–M8 still there (NFR-02) | |
| M10 | Stop server, then click Save on a form | Red banner "Could not reach the server. Try again." | |

## 4. Defect log (use in the video: "one test, defect or AI limitation")
Record real defects you find while building, e.g.:

| # | Found by | Symptom | Cause | Fix | Prompt used |
|---|---|---|---|---|---|
| 1 | | | | | |

Example from the design phase: the collapsed sidebar was cut off and showed a scrollbar. The cause was a fixed width without centring, plus overflow scrolling. It was found by inspecting a screenshot and fixed with a targeted follow-up prompt.
