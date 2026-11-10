# Explain-back notes (course standard: six questions)

Fill this in for 3–4 pieces of code you will show in the video. Recommended choices are below.

## 1. Create a request: the full roundtrip (FR-06)
`public/js/request-form.js` → `POST /api/requests` → `src/routes/requests.js` → `validation.js` → SQLite → 201 → redirect to list.
- **Purpose:** which requirement?
- **Inputs:** form fields → JSON body. Where do they come from?
- **Flow:** submit handler → browser validation → `api('POST', …)` → route → `validateRequest` → `INSERT` → response
- **Output:** 201 + new request; the list page shows "Request #N created"
- **Failures:** invalid field → 400 + fields shown under inputs; server down → error banner; not logged in → 401 → login page
- **Evidence:** test A9 + A10, manual M5, `requests.http` call

## 2. Edit / withdraw only while Submitted (FR-08, FR-09)
`canChangeRequest()` in `rules.js` used by PUT and DELETE → 409. Evidence: A13, A15.

## 3. Stock status rule (FR-04)
`stockStatus()` — pure function, boundary tests U1. Show a test failing when you change 1.15.

## 4. Login + protected routes (FR-01)
`requireLogin` middleware, hashed passwords. Evidence: A1–A3.

## Architecture in one sentence (for the video)
"The browser loads static HTML pages from Express. Each page's JavaScript calls the REST API with fetch. Express routes validate the input, run SQL against a SQLite file through node:sqlite, and return JSON with a status code. The page then shows the result or the error."

## Known risks / limitations (be upfront)
- Single clinic, single role; no Bentley approval screen, so statuses other than Submitted come from seed data
- Sessions are stored in memory, so everyone is logged out when the server restarts
- No RFID: removals are seed data
- SQLite suits one server; a multi-clinic rollout would need a server database
