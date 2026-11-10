# Getting the Node.js app running on your laptop

You need about 2–4 hours spread over the seven build steps, plus time for the video.

## A. Install the tools (once)
1. **Node.js 24 LTS:** https://nodejs.org → "LTS" installer. Check it in a terminal: `node -v` should show v24.x.
2. **Git:** https://git-scm.com. Check: `git --version`.
3. **VS Code** (recommended), with these extensions: *REST Client* (runs `requests.http`) and *SQLite Viewer* (lets you look inside the database).
4. **Claude Code:** you have the desktop app. Sign in.
   ⚠ The slides name **Codex** as the course AI tool. Ask Dr. Georges whether Claude Code is accepted. The prompts work in both.

## B. Create the project folder
1. Make an empty folder, e.g. `Documents/smart-stock`.
2. Unzip this handoff package into it, so `README.md` sits directly inside `smart-stock/`.
3. Open a terminal in that folder and run:
   ```
   git init
   git add .
   git commit -m "Specification, wireframes and business case"
   ```
4. Open the folder in Claude Code (desktop app → open folder / project).

## C. Build it step by step
Open `CLAUDE_CODE_PROMPTS.md`. For each step 0–7:
1. Paste the prompt.
2. **Inspect:** read what changed. Ask "explain this file to me like a beginner" for anything unclear.
3. **Run:** the commands under *Check* (`npm install`, `npm start`, `npm test`).
4. **Explain:** write one entry in `docs/PROMPT_LOG.md`.
5. Commit: `git add . && git commit -m "Step N: …"`.

When Claude Code asks for permission to run commands (npm install, node, etc.), allow them after reading what they do.

## D. Run the app
```
npm install        # once, installs express, express-session, supertest
npm start          # → http://localhost:3000
```
Login: `anna@stelisabeth.de` / `demo1234`.
Reset the data to the seed: `npm run reset-db`.

## E. Test the app
- `npm test`: all unit and API tests (see TESTING.md)
- `requests.http` in VS Code: click "Send Request" above each call
- Manual script M1–M10 in TESTING.md: tick each row before recording

## F. Common problems
| Problem | Fix |
|---|---|
| `node:sqlite` not found | Node is older than 22.5. Install Node 24 LTS |
| "ExperimentalWarning: SQLite" in the terminal | Harmless; it can be hidden with `node --no-warnings server.js` |
| `EADDRINUSE :3000` | Another server is running. Close the other terminal, or set `PORT=3001` |
| Logged out after a restart | Expected: sessions live in memory (listed as a known limitation) |
| Login works in the browser but tests fail with 401 | Tests must use `request.agent(app)` so the cookie is kept |

## G. Submission checklist (from the slides)
- [ ] App runs with Node.js, HTML/CSS, data storage, and a CRUD roundtrip that works from the UI
- [ ] `BUSINESS_CASE.md` + wireframes match what the app does
- [ ] Prompt log with iterations, decisions and rejected alternatives
- [ ] Tests that cover success and failure cases, plus at least one defect you found and fixed
- [ ] **Individual video**: `.mp4`, your own voice, **≤ 10 minutes**, submitted via RELAX before the deadline (a missed deadline scores 0):
  1. Business case + live demo: **max 3 minutes**
  2. Prompt approach + at least one meaningful iteration (show PROMPT_LOG)
  3. Selected Node.js code + data flow from frontend to backend (use EXPLAIN_BACK.md #1)
  4. One test, defect or AI limitation and how you dealt with it (TESTING.md section 4)
- [ ] Team project, but each student must be able to explain the whole app individually
