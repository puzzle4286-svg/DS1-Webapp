# Business case: Bentley Smart Stock

## 1. Business problem
Bentley supplies clinics with stents and balloon catheters on **consignment**: the products sit in the clinic's storage room but belong to Bentley until they are used. Today, stock is tracked with spreadsheets, phone calls and e-mail.

This causes three costly problems:
- **Expired products.** Clinics don't see which lots expire soon, so older units stay on the shelf and expire. Bentley writes off their value (around €1,200 per stent).
- **Wrong stock levels.** Some products run out before procedures, while others pile up above need and tie up Bentley's capital.
- **Unreported removals.** Units leave storage without a usage report. Bentley can't invoice them, and the clinic can't explain the gap at audit.

## 2. Target users
| User | Context | Needs |
|---|---|---|
| **Inventory manager at a clinic** (primary, e.g. "Anna K.", cath-lab nurse) | Checks storage 1–2× per week between procedures, at a desktop PC | See stock vs. recommendation at a glance · know what expires next · reorder in under a minute · explain gaps quickly |
| **Bentley customer service** (secondary, not a user of this version) | Receives requests | Complete, validated requests instead of free-text e-mails |

## 3. Process (to-be)
1. Inventory manager signs in.
2. Dashboard shows what needs attention: expiring lots, products below the recommendation, open removals.
3. **Check & reorder:** open product → see lots and suggested quantity → submit replenishment request.
4. **Manage requests:** view status, correct or withdraw a request while Bentley has not started it.
5. **Use first:** mark lots that expire soon, so colleagues take them first.
6. **Resolve removals:** explain each unit that left storage without a report, or report it as usage.

## 4. Measurable outcomes (targets for a pilot clinic)
- Expired units written off: −50% within 6 months
- Time to create a replenishment request: < 1 minute (today ~10 min by e-mail/phone)
- Open unreported removals older than 14 days: 0
- Requests needing follow-up questions from Bentley: < 10% (validation enforces complete data)

## 5. Functional requirements and acceptance criteria
Each requirement is testable. The test IDs refer to `TESTING.md`.

| ID | Requirement | Acceptance criteria | Screen | Test |
|---|---|---|---|---|
| FR-01 | Only signed-in users can use the app | Correct email + password → dashboard. Wrong password → "Email or password is incorrect", stays on login. Calling any `/api/*` route without a session → 401. Opening any page without a session → redirect to login. | S1 | A1–A3, M1 |
| FR-02 | Dashboard summarises what needs attention | Shows units in stock, lots expiring ≤ 90 days, products below recommended, open removals; numbers match the database. Each card links to the matching list. | S2 | A4, M2 |
| FR-03 | User can find products | Search matches name or code (case-insensitive). Filters: category, stock status. No match → "No products match your filters." + Clear filters. | S3 | A5–A6, M3 |
| FR-04 | User sees stock status and lots per product | Status follows the rule in README (out/below/on/above). Lots sorted by expiry, soonest first, each with tier critical (≤ 90 d) / warning (≤ 180 d) / ok. Unknown id → 404 "Product not found." | S4 | U1–U2, A7 |
| FR-05 | User can mark a lot as "use first" | Ticking the checkbox saves immediately and persists after reload. | S4 | A8, M4 |
| FR-06 | User can create a request | Type, product and quantity are required. Quantity must be a whole number from 1 to 100. A reason is required for usage reports and returns. Notes are limited to 500 characters. A valid request is saved with status Submitted and shown at the top of the list with "Request #N created". An invalid one shows the message under the field and saves nothing. | S6 | V1–V4, A9–A10, M5 |
| FR-07 | User can view requests | List newest first, filter by status and type. | S5 | A11 |
| FR-08 | User can edit a request | Only while status = Submitted. The form opens with the saved values and saving updates them. For any other status the API returns 409 and the UI shows no Edit button. | S6 | A12–A13, M6 |
| FR-09 | User can withdraw a request | Only while Submitted, after a confirm dialog. The request disappears from the list and the database. | S5 | A14–A15, M7 |
| FR-10 | User sees unreported removals | Tabs: Open / Explained, with the open count shown. | S7 | A16 |
| FR-11 | User can explain a removal | Reason is required. A note is required when the reason is "Other". Once saved, the removal moves to Explained. Explaining a removal twice returns 409. | S7 | V5, A17–A18, M8 |

## 6. Non-functional requirements
- **NFR-01 Feedback:** every save shows a success or error message; buttons are disabled while saving; lists show loading and empty states.
- **NFR-02 Data persistence:** data survives a server restart (SQLite file).
- **NFR-03 Security basics:** passwords stored hashed, never returned by the API; SQL uses prepared statements.
- **NFR-04 Usability:** works in current Chrome/Edge/Firefox at ≥ 1024px width; all form fields have labels.

## 7. Out of scope (future work)
RFID reader integration, incentives/discounts, reports, notifications, multi-clinic and roles, Bentley-side approval screen. These are shown in the hi-fi prototype (`design/Smart Stock.dc.html`) and wireframe turn 1.
