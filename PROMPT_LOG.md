# Prompt log

One entry per prompt that changed code. Keep it honest: rejected AI output is good evidence.

---
### #1 — <date> — Step 1 skeleton + database
**Goal / requirement:** FR-… / NFR-02
**Prompt (summary or copy):**
**What the AI produced:** files changed …
**How I checked it (Inspect + Run):** command / test / screenshot …
**Result:** ✅ accepted · ⚠️ changed · ❌ rejected
**Decision & reason:** e.g. "AI proposed better-sqlite3; I kept node:sqlite because it needs no native install on my laptop."
**Alternatives rejected:**
**Follow-up prompt:**

---
### Design phase (before coding) — summary of earlier iterations
- Visual identity: replaced generic green with Bentley blue after supplying the official logo; accent text darkened for contrast.
- Sign-in screen: removed stock photo on feedback; replaced subtitle with brand values "Consistency. Courage. Care".
- Defect: collapsed sidebar clipped the expand button and showed a scrollbar → fixed in two iterations (layout, then hidden scrollbar).
- Scope decision: 14-screen prototype reduced to 7 screens for the course app so every part can be built, tested and explained.
- Rejected alternative: Fastify + PostgreSQL + Prisma + React (first plan) → replaced by Express + SQLite + plain HTML/JS to match the course parts and keep the code explainable.
