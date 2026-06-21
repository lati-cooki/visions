# AGENTS.md

This is **Visions** — a Vite + React + Tailwind frontend with a zero-dependency Cloudflare
Worker backend (D1-backed). See `README.md` and `CLAUDE.md` for architecture, the API contract,
and standard commands; this file only captures non-obvious operating notes.

## Cursor Cloud specific instructions

The update script runs `npm install`, which is all that's needed for the three no-config
workflows: tests, build, and the mock-mode frontend.

- **Tests / build / lint:** `npm test` (backend `node --test`, 56 tests) and `npm run build`
  work with only `npm install`. There is **no linter configured** (no ESLint/Prettier) — there
  is no `lint` script, so "lint" just means tests + a clean build.
- **Frontend dev (mock mode):** `npm run dev` (http://localhost:5173) is fully demoable with no
  backend, API key, or third-party setup — `VITE_USE_MOCK=true` makes `src/lib/api.js` return
  mock data, so the whole intake → plan flow works offline (any 6-digit verify code is accepted).

### Full-stack worker (`npm run worker:dev`, http://localhost:8787)

Only needed when exercising the real Worker/D1 backend. Setup that is NOT in the update script
(state is gitignored and ephemeral per VM, so redo it each session for full-stack work):

1. `cp .dev.vars.example .dev.vars` (gitignored; holds dev secrets + `VERIFY_DEV_ECHO=true` and
   `ACCESS_DEV_BYPASS=true`).
2. `npm run db:schema:local` — applies the full schema to the local D1 (state in `.wrangler/`).
3. `npm run build` first — the Worker serves the static frontend from `./dist`.
4. `npm run worker:dev`.

Caveats:
- **Do NOT run `npm run db:migrate:local` on a fresh local DB** — it fails with
  `duplicate column name: email` because `schema.sql` already includes the email-gate changes.
  The migration in `migrations/` is only for upgrading pre-existing databases.
- **`wrangler dev` shows a one-time interactive prompt** ("install Cloudflare skills for Cursor?")
  on first run — answer `n`, or it blocks startup.
- **Plan generation needs a real `ANTHROPIC_API_KEY`.** With the placeholder key, `POST /api/plan`
  passes the email-verification gate, reaches Claude, and returns `"The AI service returned an
  error."`. Everything else works locally without a key: `/api/health`, `/api/verify/start`
  (echoes a dev code), `/api/verify/check`, `/api/booking`, and the `/api/admin/*` routes (via
  `ACCESS_DEV_BYPASS`). Use mock-mode `npm run dev` to demo plan generation without a key.
- Workers Rate Limiting and Cloudflare Email Sending only run on Cloudflare's network, not in
  `wrangler dev`; verification codes are echoed in the response instead of emailed.
