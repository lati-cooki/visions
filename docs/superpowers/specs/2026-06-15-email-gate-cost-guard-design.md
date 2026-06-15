# Email-verified plan generation + cost guard — design

**Date:** 2026-06-15
**Owner:** Troy Latimer / Lati Cooki LLC
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

`/api/plan` spends real Anthropic tokens (~$0.05/plan) on every request from an
anonymous public web app. Today the only protections are Turnstile + per-IP rate
limiting — there is no ceiling on total daily spend and no per-person throttle.

Separately, the task feature is confusing: tasks live in a **single global
`localStorage` key** (`visions:tasks`), not scoped to a plan, so every plan's tasks
pile into one bucket, a visited shared plan's tasks merge into the visitor's list, and
nothing survives a browser switch. The reserved `tasks` D1 table is unused.

## Goal

1. **Genuinely cap token spend** on plan generation — a hard daily ceiling that cannot
   be exceeded regardless of who is asking.
2. **Gate generation behind a verified email** (inline 6-digit code), as a friction +
   identity layer on top of the hard cap.
3. **Deliver the plan to that verified email** — email becomes both the cost gate and
   the "keep your plan" mechanism.
4. **Remove the tasks feature entirely** — the plan-in-your-inbox replaces it; the
   orphaned todo list goes away rather than getting patched.

Non-goals: accounts/passwords/OAuth, cross-plan task history, magic links, any Phase
2/3 dashboard. Identity is "a verified email address," nothing heavier.

## Design principle: the cap is the guarantee

Email verification is a *weak* cost barrier on its own — disposable/alias addresses
defeat it. It is worth doing for friction + identity + delivery, but the thing that
actually promises "I won't overspend" is the **global daily cap**. The cap is
non-negotiable and is the real backstop; the email gate sits on top.

Defense layers, outermost first:

1. **Turnstile** — moved to `/api/verify/start` so bots are stopped *before* they can
   trigger a verification email (protecting the email-send cost vector too) and before
   they can obtain a token for `/api/plan`.
2. **Per-IP rate limits** — on verify endpoints and (still) on `/api/plan`.
3. **Email verification** — a valid, unexpired, HMAC-signed verify token is required to
   call `/api/plan`. Obtaining one requires receiving a code at a real inbox.
4. **Per-email daily cap** — default **3 plans/email/day**.
5. **Global daily cap** — default **200 plans/day (~$10)**. When tripped, `/api/plan`
   refuses with a friendly "we've hit today's capacity, check back tomorrow." This is
   the absolute ceiling.

## User flow

```
3-step intake (unchanged)
  → enter email  ──POST /api/verify/start {email, turnstileToken}──▶ code emailed
  → enter 6-digit code  ──POST /api/verify/check {email, code}──▶ { token }
  → generate  ──POST /api/plan {profile, verifyToken}──▶ caps checked → plan generated
       → plan persisted (with email) + plan emailed to the verified address
       → results page shows the plan (no Tasks tab)
```

The token spend happens **only** after Turnstile passed, the token is valid, and both
caps are under limit.

## Backend

### New endpoints

| Method + path           | Body                          | Returns                              |
|-------------------------|-------------------------------|--------------------------------------|
| `POST /api/verify/start`| `{ email, turnstileToken }`   | `{ ok: true }` (`+ devCode` in dev)  |
| `POST /api/verify/check`| `{ email, code }`             | `{ token }` on success               |

### Modified endpoint

`POST /api/plan` — body gains `verifyToken`; **Turnstile moves out** (now enforced at
`/api/verify/start`). Order of checks:

1. Validate profile (existing).
2. Verify `verifyToken` (HMAC valid + not expired) → yields the verified `email`. Reject
   `401` if missing/invalid/expired.
3. Per-email cap: count today's plans for `email`; reject `429` if `>= PER_EMAIL_DAILY_CAP`.
4. Global cap: count today's plans (all); reject `429` (capacity message) if
   `>= GLOBAL_DAILY_PLAN_CAP`.
5. Generate (existing path), persist plan **with `email`**, email the plan via
   `ctx.waitUntil` (non-fatal, mirrors booking email), return `{ id, plan }`.

### Verification code storage — new D1 table

```sql
CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,          -- SHA-256(pepper + email + code), never the raw code
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
```

- Code: 6 random digits (Web Crypto `crypto.getRandomValues`).
- Hash with SHA-256 over `VERIFY_CODE_PEPPER + email + code` (Web Crypto `subtle.digest`)
  — raw codes are never stored.
- TTL: `VERIFY_CODE_TTL_MIN` (default 10 min).
- `/api/verify/check` looks up the latest unexpired, unconsumed row for the email,
  increments `attempts`, compares hashes. After 5 failed attempts the row is invalidated
  (must resend). On success: mark `consumed_at`, mint and return a token.

### Verify token — stateless, no sessions table

HMAC-SHA256 over `email|exp` with secret `VERIFY_TOKEN_SECRET`, base64url-encoded. TTL
`VERIFY_TOKEN_TTL_MIN` (default 30 min). `/api/plan` recomputes the HMAC and checks
expiry — no DB lookup. The email inside the token is the address we persist and send to.

### Cap counting

Counted directly from `plans` (a row exists only on a *successful, paid* generation, so
the count == actual spend). Day boundary is UTC.

- Per-email: `SELECT count(*) FROM plans WHERE email = ? AND created_at >= <UTC midnight>`
- Global:   `SELECT count(*) FROM plans WHERE created_at >= <UTC midnight>`

`plans` gains an `email TEXT` column + `CREATE INDEX idx_plans_email ON plans(email)`.
`idx_plans_created` already exists. A small race under burst concurrency is acceptable
for this volume (the global cap may be exceeded by at most the number of in-flight
requests — single digits).

### Email sending (extend `worker/src/lib/email.js`)

Two new pure composers + send wrappers, following the existing
`buildBookingEmail`/`sendBookingEmail` pattern:

- **Verification code email** — `buildVerifyCodeEmail(email, code)` + sender. On the
  critical path: **awaited**, and a send failure surfaces as `503` ("couldn't send
  code, try again"). FROM reuses a configured sender on l8ti.com.
- **Plan email** — `buildPlanEmail(plan, planId, siteUrl)` + sender. Contains the
  readable plan (headline, quick wins, next step) **plus a link to `/plan/:id`**. Sent
  **non-fatally** via `ctx.waitUntil`; failure is logged and never blocks the response.

**Hard prerequisite:** l8ti.com must be onboarded to Cloudflare Email Sending (already a
pending follow-up in CLAUDE.md). Until then verification codes cannot deliver and the
gate is non-functional in prod.

**Dev/testability:** when `VERIFY_DEV_ECHO = "true"` (set only in `.dev.vars`),
`/api/verify/start` returns `devCode` in the JSON and/or logs it, so the flow is testable
locally without real email. Production never echoes.

### Rate limiting (`wrangler.toml`)

- `VERIFY_START_RATE_LIMITER` — per IP, ~5/60s. Plus an app-level per-email throttle
  (max 1 code/60s/email, derived from `email_verifications.created_at`) to stop emailing
  the same address repeatedly.
- `VERIFY_CHECK_RATE_LIMITER` — per IP, to blunt code brute-forcing (the 5-attempt
  per-code counter is the inner guard).
- `PLAN_RATE_LIMITER` — unchanged.

### Config / secrets

- New secrets: `VERIFY_TOKEN_SECRET`, `VERIFY_CODE_PEPPER` (HMAC key + code-hash pepper;
  may be one secret).
- New `[vars]`: `GLOBAL_DAILY_PLAN_CAP` (200), `PER_EMAIL_DAILY_CAP` (3),
  `VERIFY_CODE_TTL_MIN` (10), `VERIFY_TOKEN_TTL_MIN` (30), a `VERIFY_EMAIL_FROM`
  (e.g. `plans@l8ti.com`), and `SITE_URL` for plan-email links. `VERIFY_DEV_ECHO` lives
  in `.dev.vars` only.

## Frontend

### New component — `src/components/intake/EmailVerifyStep.jsx`

Renders after the details step, before generation:

1. Email input + Turnstile widget → "Send code" (calls `startVerification`).
2. 6-digit code input → "Verify & get my plan" (calls `checkVerification`, then triggers
   plan generation with the returned token).
3. States: invalid email, code sent, wrong/expired code, resend, rate-limited (429),
   per-email cap reached, global cap reached ("today's capacity") — each a clear message.

### `src/lib/api.js`

- Add `startVerification(email, turnstileToken)` and `checkVerification(email, code)`.
- `createPlan` gains a `verifyToken` argument; Turnstile token moves to the verify start
  call.
- **Mock mode** stays fully demoable: mock `startVerification` returns `{ ok: true }`,
  mock `checkVerification` accepts any 6-digit code and returns a fake token, mock
  `createPlan` ignores the token. `npm run dev` needs no backend/key/email.

### Remove tasks

- Delete `src/components/results/TaskBoard.jsx` and `src/lib/tasks.js`.
- `src/components/results/ResultsView.jsx`: drop the `tasks` tab + `tasks`/`setTasks`
  props + `TaskBoard` render.
- `src/pages/AdvisorFlow.jsx` and `src/pages/SharedPlan.jsx`: remove tasks state,
  `TASKS_KEY`, the storage load, `buildPlanTasks`, the "Add to Tasks" handler, and the
  props.
- `src/lib/storage.js`: remove if no other consumer remains (verify with grep first).

### Schema / prompt cleanup (low priority)

- Drop the unused `tasks` table from `schema.sql`; run `DROP TABLE IF EXISTS tasks` on
  prod (empty/unused → harmless either way).
- The `quick_wins[].task` field in `PLAN_SCHEMA`/prompt only existed to seed tasks.
  Remove it from the schema + prompt to trim tokens. Optional, lands with the cleanup.

## Error handling

| Condition                     | Response                                                |
|-------------------------------|---------------------------------------------------------|
| Invalid email                 | `400`, client + server validation                       |
| Code expired (10 min)         | "Code expired — resend"                                 |
| Wrong code                    | increment attempts; after 5 → invalidate, must resend   |
| Too many code requests        | `429` friendly throttle message                         |
| Missing/invalid verify token  | `401` on `/api/plan`                                    |
| Per-email cap reached         | `429` "today's limit of 3 plans for this email"         |
| Global cap reached            | `429` "we've hit today's capacity, check back tomorrow" |
| Code-email send failed        | `503` "couldn't send the code, try again"               |
| Plan-email send failed        | non-fatal — plan still shown on screen; logged          |

## Testing (`node --test`, backend)

- **verify token lib:** sign/verify round-trip, expiry, tamper rejection.
- **code lib:** hashing is deterministic + peppered; raw code never persisted.
- **verify/start:** email validation, dev-echo gated by env, per-email throttle.
- **verify/check:** correct code → token; wrong code increments attempts; expired;
  consumed; >5 attempts invalidates.
- **/api/plan:** rejects without/with bad token; enforces per-email cap; enforces global
  cap; persists `email`; schedules plan email.
- **caps:** UTC day-boundary counting.
- **email composers:** `buildVerifyCodeEmail`, `buildPlanEmail` (pure → directly tested).

## Sequencing

1. **Backend gate:** `email_verifications` table, verify token lib, code lib,
   `/api/verify/start` + `/api/verify/check`, code email (with dev echo), move Turnstile.
2. **Backend caps + delivery:** `plans.email` column + index, token requirement + caps on
   `/api/plan`, plan email.
3. **Frontend:** `EmailVerifyStep`, `api.js` changes, remove tasks.
4. **Cleanup:** drop `tasks` table, remove `quick_wins[].task` from schema/prompt.
5. **Ops/prereqs:** onboard l8ti.com to Email Sending; set new secrets + vars; add verify
   rate-limit bindings; rotate the Turnstile secret (already a pending follow-up).

## Dependencies / risks

- **Email Sending onboarding for l8ti.com is a hard blocker** for the gate in prod —
  without it, codes don't deliver. Dev echo de-risks local development meanwhile.
- Disposable emails weaken the email layer; mitigated by the caps being the real ceiling.
- Cap is count-based (≈ uniform $0.05/plan), not measured token cost — adequate for a
  fixed-shape structured-output call; revisit if model/output size changes materially.
