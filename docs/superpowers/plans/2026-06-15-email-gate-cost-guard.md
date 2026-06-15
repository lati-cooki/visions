# Email-Verified Plan Generation + Cost Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate `/api/plan` behind a verified email (inline 6-digit code) backed by hard daily caps, email the generated plan to the verified address, and remove the orphaned tasks feature.

**Architecture:** Three new Worker endpoints (`/api/verify/start`, `/api/verify/check`, plus a modified `/api/plan`). Turnstile moves to `verify/start`; a stateless HMAC-signed token proves verification to `/api/plan`; a global + per-email daily cap (counted from the `plans` table) is the real spend ceiling. The plan is emailed via the existing Email Sending binding. Frontend gains an `EmailVerifyStep` between intake and results; the localStorage-based task board is deleted.

**Tech Stack:** Cloudflare Worker (zero-dependency ESM), D1, Web Crypto (`crypto.subtle`/`getRandomValues`), Vite + React, `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-15-email-gate-cost-guard-design.md`

---

## File Structure

**New backend files**
- `worker/src/lib/verifyToken.js` — HMAC sign/verify of `email|exp` (stateless verification token).
- `worker/src/lib/code.js` — 6-digit code generation + SHA-256 peppered hashing.
- `worker/src/handlers/verifyStart.js` — `POST /api/verify/start`.
- `worker/src/handlers/verifyCheck.js` — `POST /api/verify/check`.
- `migrations/2026-06-15-email-gate.sql` — one-time migration for the live D1.
- Tests: `worker/test/verifyToken.test.js`, `worker/test/code.test.js`, `worker/test/email.test.js`, `worker/test/dates.test.js` (+ additions to `worker/test/validate.test.js`).

**Modified backend files**
- `worker/src/lib/validate.js` — add `validateVerifyStart`, `validateVerifyCheck`.
- `worker/src/lib/db.js` — verification CRUD, cap counts, `startOfUtcDayIso`, `insertPlan` email column.
- `worker/src/lib/email.js` — add verify-code + plan email composers/senders.
- `worker/src/lib/router.js` — add the two verify routes.
- `worker/src/index.js` — dispatch + verify rate limiters + pass `ctx` to plan.
- `worker/src/handlers/plan.js` — require token, enforce caps, persist email, email the plan.
- `schema.sql` — `plans.email`, `email_verifications`, indexes, drop `tasks`.
- `wrangler.toml` — vars, two ratelimit bindings.
- `.dev.vars.example` — new dev secrets/flags.
- `package.json` — `db:migrate:local` / `db:migrate:remote` scripts.

**New frontend files**
- `src/components/intake/EmailVerifyStep.jsx`.

**Modified frontend files**
- `src/lib/api.js`, `src/pages/AdvisorFlow.jsx`, `src/pages/SharedPlan.jsx`, `src/components/results/ResultsView.jsx`, `src/components/results/PlanView.jsx`.

**Deleted frontend files**
- `src/components/results/TaskBoard.jsx`, `src/lib/tasks.js`, `src/lib/storage.js`.

**Intentional deviation from spec:** the spec lists removing `quick_wins[].task` from `PLAN_SCHEMA` as optional cleanup ("only existed to seed tasks"). We are **keeping** it: `PlanView.jsx` renders `win.task` as the per-win "Action:" callout — it is user-facing plan content, not just task-board seed data. Removing it would lose value. No change to `prompts.js`.

---

## Task 1: Verification token library (HMAC)

**Files:**
- Create: `worker/src/lib/verifyToken.js`
- Test: `worker/test/verifyToken.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/verifyToken.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { signVerifyToken, verifyVerifyToken } from "../src/lib/verifyToken.js";

const SECRET = "test-secret";
const NOW = 1_700_000_000_000;

test("signs and verifies a token, recovering the email", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const result = await verifyVerifyToken(SECRET, token, NOW + 60_000);
  assert.deepEqual(result, { valid: true, email: "owner@biz.com" });
});

test("rejects an expired token", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const result = await verifyVerifyToken(SECRET, token, NOW + 31 * 60_000);
  assert.equal(result.valid, false);
});

test("rejects a token signed with a different secret", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  assert.equal((await verifyVerifyToken("other-secret", token, NOW)).valid, false);
});

test("rejects a tampered payload", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const [, sig] = token.split(".");
  const forged = `${Buffer.from("evil@biz.com|" + (NOW + 9e9)).toString("base64url")}.${sig}`;
  assert.equal((await verifyVerifyToken(SECRET, forged, NOW)).valid, false);
});

test("rejects malformed tokens", async () => {
  assert.equal((await verifyVerifyToken(SECRET, "", NOW)).valid, false);
  assert.equal((await verifyVerifyToken(SECRET, "no-dot", NOW)).valid, false);
  assert.equal((await verifyVerifyToken(SECRET, null, NOW)).valid, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/verifyToken.test.js`
Expected: FAIL — `Cannot find module '../src/lib/verifyToken.js'`.

- [ ] **Step 3: Write the implementation**

```js
// worker/src/lib/verifyToken.js
// Stateless verification token: base64url(`email|exp`) + "." + base64url(HMAC-SHA256).
// No DB lookup — /api/plan recomputes the HMAC and checks expiry. Web Crypto only, so it
// runs identically in the Worker runtime and in `node --test`.

const enc = new TextEncoder();

function b64urlFromBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(b64) {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

async function hmacB64(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlFromBytes(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signVerifyToken(secret, email, ttlMinutes, nowMs) {
  const exp = nowMs + ttlMinutes * 60_000;
  const payload = b64urlFromBytes(enc.encode(`${email}|${exp}`));
  const sig = await hmacB64(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyVerifyToken(secret, token, nowMs) {
  if (typeof token !== "string" || !token.includes(".")) return { valid: false };
  const [payload, sig] = token.split(".");
  const expected = await hmacB64(secret, payload);
  if (!timingSafeEqual(sig, expected)) return { valid: false };

  let decoded;
  try {
    decoded = b64urlToString(payload);
  } catch {
    return { valid: false };
  }
  const sep = decoded.lastIndexOf("|");
  if (sep === -1) return { valid: false };
  const email = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!email || !Number.isFinite(exp) || nowMs > exp) return { valid: false };
  return { valid: true, email };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/verifyToken.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/verifyToken.js worker/test/verifyToken.test.js
git commit -m "Add HMAC verification-token library"
```

---

## Task 2: Verification code library

**Files:**
- Create: `worker/src/lib/code.js`
- Test: `worker/test/code.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/code.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode, hashCode } from "../src/lib/code.js";

test("generateCode returns a 6-digit string", () => {
  for (let i = 0; i < 50; i++) {
    assert.match(generateCode(), /^\d{6}$/);
  }
});

test("hashCode is deterministic for the same inputs", async () => {
  const a = await hashCode("pep", "owner@biz.com", "123456");
  const b = await hashCode("pep", "owner@biz.com", "123456");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("hashCode never equals the raw code and varies by pepper/email", async () => {
  const base = await hashCode("pep", "owner@biz.com", "123456");
  assert.notEqual(base, "123456");
  assert.notEqual(base, await hashCode("other-pep", "owner@biz.com", "123456"));
  assert.notEqual(base, await hashCode("pep", "someone@biz.com", "123456"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/code.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// worker/src/lib/code.js
// 6-digit verification codes. Raw codes are emailed but never stored — only a SHA-256
// hash peppered with a server secret + the email is persisted.

const enc = new TextEncoder();

export function generateCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

export async function hashCode(pepper, email, code) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${pepper}|${email}|${code}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/code.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/code.js worker/test/code.test.js
git commit -m "Add verification-code generation + hashing"
```

---

## Task 3: Verify-request validators

**Files:**
- Modify: `worker/src/lib/validate.js`
- Test: `worker/test/validate.test.js`

- [ ] **Step 1: Add the failing test cases**

Append to `worker/test/validate.test.js` (and add the two names to the existing import on lines 3-8):

```js
import {
  validateProfile,
  normalizeProfile,
  validateChat,
  validateBooking,
  validateVerifyStart,
  validateVerifyCheck,
} from "../src/lib/validate.js";

test("validateVerifyStart requires a valid email", () => {
  assert.equal(validateVerifyStart({ email: "owner@biz.com" }), null);
  assert.match(validateVerifyStart(null), /Missing request body/);
  assert.match(validateVerifyStart({ email: "nope" }), /valid email/);
  assert.match(validateVerifyStart({ email: "a@b.co".padEnd(260, "x") }), /too long/);
});

test("validateVerifyCheck requires email + 6-digit code", () => {
  assert.equal(validateVerifyCheck({ email: "owner@biz.com", code: "123456" }), null);
  assert.equal(validateVerifyCheck({ email: "owner@biz.com", code: " 123456 " }), null);
  assert.match(validateVerifyCheck({ email: "owner@biz.com", code: "12345" }), /6-digit/);
  assert.match(validateVerifyCheck({ email: "owner@biz.com", code: "abcdef" }), /6-digit/);
  assert.match(validateVerifyCheck({ email: "nope", code: "123456" }), /valid email/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/validate.test.js`
Expected: FAIL — `validateVerifyStart is not a function`.

- [ ] **Step 3: Add the validators**

Append to `worker/src/lib/validate.js` (reuses the existing `EMAIL_RE` on line 6):

```js
export function validateVerifyStart(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email))
    return "A valid email is required.";
  if (body.email.length > 254) return "Email is too long.";
  return null;
}

export function validateVerifyCheck(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email))
    return "A valid email is required.";
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code.trim()))
    return "A 6-digit code is required.";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/validate.test.js`
Expected: PASS (all original + 2 new tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/validate.js worker/test/validate.test.js
git commit -m "Validate verify/start + verify/check bodies"
```

---

## Task 4: Email composers (verify code + plan)

**Files:**
- Modify: `worker/src/lib/email.js`
- Test: `worker/test/email.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/email.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVerifyCodeEmail, buildPlanEmail } from "../src/lib/email.js";

const FROM = { email: "plans@l8ti.com", name: "Visions" };

test("buildVerifyCodeEmail puts the code in subject + body", () => {
  const msg = buildVerifyCodeEmail("owner@biz.com", "123456", FROM);
  assert.equal(msg.to, "owner@biz.com");
  assert.deepEqual(msg.from, FROM);
  assert.match(msg.subject, /123456/);
  assert.match(msg.text, /123456/);
  assert.match(msg.text, /expires/i);
});

test("buildPlanEmail includes headline, quick wins, next step, and link", () => {
  const plan = {
    headline: "Your focused AI plan",
    quick_wins: [
      { title: "Automate FAQs", description: "Stand up an assistant.", monthly_cost: "$0-20/mo" },
      { title: "Batch social", description: "Draft a week at once." },
    ],
    next_step: "Pick the easiest win.",
  };
  const msg = buildPlanEmail("owner@biz.com", plan, "https://l8ti.com/plan/abc123", FROM);
  assert.match(msg.text, /Your focused AI plan/);
  assert.match(msg.text, /Automate FAQs/);
  assert.match(msg.text, /\$0-20\/mo/);
  assert.match(msg.text, /Pick the easiest win/);
  assert.match(msg.text, /https:\/\/l8ti\.com\/plan\/abc123/);
});

test("buildPlanEmail tolerates a sparse plan", () => {
  const msg = buildPlanEmail("owner@biz.com", {}, "https://l8ti.com/plan/x", FROM);
  assert.match(msg.text, /https:\/\/l8ti\.com\/plan\/x/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/email.test.js`
Expected: FAIL — `buildVerifyCodeEmail is not a function`.

- [ ] **Step 3: Add composers + senders to `worker/src/lib/email.js`**

First add the import at the top of the file (it currently has none):

```js
import { ApiError } from "./http.js";
```

Then append:

```js
// ── Verification code email (critical path: awaited by the handler) ──
export function buildVerifyCodeEmail(toEmail, code, from) {
  const subject = `Your Visions code: ${code}`;
  const text = [
    `Your verification code is: ${code}`,
    "",
    "Enter this code to get your AI plan. It expires in 10 minutes.",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");
  return { to: toEmail, from, subject, text };
}

export async function sendVerifyCodeEmail(env, toEmail, code) {
  if (!env.EMAIL || !env.VERIFY_EMAIL_FROM) {
    // In dev the handler echoes the code instead, so a missing binding is non-fatal there.
    if (env.VERIFY_DEV_ECHO === "true") return false;
    throw new ApiError("Email is not configured.", 500);
  }
  const msg = buildVerifyCodeEmail(toEmail, code, { email: env.VERIFY_EMAIL_FROM, name: "Visions" });
  await env.EMAIL.send({
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    text: msg.text,
    html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>`,
  });
  return true;
}

// ── Plan delivery email (non-fatal: sent via ctx.waitUntil) ──
export function buildPlanEmail(toEmail, plan, planUrl, from) {
  const wins = (plan?.quick_wins || [])
    .map(
      (w, i) =>
        `${i + 1}. ${w.title}${w.monthly_cost ? ` (${w.monthly_cost})` : ""}\n   ${w.description || ""}`
    )
    .join("\n\n");
  const text = [
    plan?.headline || "Here's your AI plan.",
    "",
    "QUICK WINS",
    wins || "(none)",
    plan?.next_step ? `\nTHIS WEEK\n${plan.next_step}` : null,
    "",
    `View or share your full plan: ${planUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  return { to: toEmail, from, subject: "Your Visions AI plan", text };
}

export async function sendPlanEmail(env, toEmail, plan, planId) {
  if (!env.EMAIL || !env.VERIFY_EMAIL_FROM) return false;
  const base = (env.SITE_URL || "").replace(/\/$/, "");
  const planUrl = `${base}/plan/${planId}`;
  const msg = buildPlanEmail(toEmail, plan, planUrl, { email: env.VERIFY_EMAIL_FROM, name: "Visions" });
  await env.EMAIL.send({
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    text: msg.text,
    html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>`,
  });
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/email.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/email.js worker/test/email.test.js
git commit -m "Add verify-code + plan-delivery email composers"
```

---

## Task 5: UTC day-boundary helper

**Files:**
- Modify: `worker/src/lib/db.js`
- Test: `worker/test/dates.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/dates.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { startOfUtcDayIso } from "../src/lib/db.js";

test("startOfUtcDayIso returns midnight UTC for the given instant", () => {
  const noonUtc = Date.UTC(2026, 5, 15, 12, 30, 0); // 2026-06-15T12:30:00Z
  assert.equal(startOfUtcDayIso(noonUtc), "2026-06-15T00:00:00.000Z");
});

test("startOfUtcDayIso is stable across a whole UTC day", () => {
  const a = startOfUtcDayIso(Date.UTC(2026, 5, 15, 0, 0, 1));
  const b = startOfUtcDayIso(Date.UTC(2026, 5, 15, 23, 59, 59));
  assert.equal(a, b);
  assert.equal(a, "2026-06-15T00:00:00.000Z");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/dates.test.js`
Expected: FAIL — `startOfUtcDayIso is not a function`.

- [ ] **Step 3: Add the helper to `worker/src/lib/db.js`**

Add near the top, after the `safeParse` helper (line 10):

```js
// Midnight-UTC ISO string for the day containing `nowMs`. Used for daily-cap windows;
// ISO timestamps sort lexicographically, so `created_at >= startOfUtcDayIso(...)` works.
export function startOfUtcDayIso(nowMs) {
  const d = new Date(nowMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/dates.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/db.js worker/test/dates.test.js
git commit -m "Add UTC day-boundary helper for daily caps"
```

---

## Task 6: D1 access for verifications, caps, and plan email column

**Files:**
- Modify: `worker/src/lib/db.js`

No unit test (these need a live `env.DB`; the repo's convention is to unit-test pure functions only and verify DB code via `worker:dev`). Verified end-to-end in Task 18.

- [ ] **Step 1: Update `insertPlan` to persist the email**

Replace the `insertPlan` function (lines 12-29) with:

```js
export async function insertPlan(env, { id, profile, recommendations, email }) {
  await env.DB.prepare(
    `INSERT INTO plans
       (id, business_type, pain_points, team_size, budget, extra_context, recommendations, created_at, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      profile.businessType,
      JSON.stringify(profile.painPoints || []),
      profile.teamSize || "",
      profile.budget || "",
      profile.extraContext || "",
      JSON.stringify(recommendations),
      new Date().toISOString(),
      email || null
    )
    .run();
}
```

- [ ] **Step 2: Append verification + cap helpers to `worker/src/lib/db.js`**

```js
// ── Email verification codes ──
export async function insertVerification(env, { id, email, codeHash, expiresAt, createdAt }) {
  await env.DB.prepare(
    `INSERT INTO email_verifications (id, email, code_hash, attempts, expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  )
    .bind(id, email, codeHash, expiresAt, createdAt)
    .run();
}

// Most recent unconsumed, unexpired code for an email.
export async function latestActiveVerification(env, email, nowIso) {
  return await env.DB.prepare(
    `SELECT id, email, code_hash, attempts, expires_at, consumed_at, created_at
       FROM email_verifications
      WHERE email = ? AND consumed_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC LIMIT 1`
  )
    .bind(email, nowIso)
    .first();
}

export async function incrementVerificationAttempts(env, id) {
  await env.DB.prepare(
    `UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`
  )
    .bind(id)
    .run();
}

export async function consumeVerification(env, id, consumedAtIso) {
  await env.DB.prepare(`UPDATE email_verifications SET consumed_at = ? WHERE id = ?`)
    .bind(consumedAtIso, id)
    .run();
}

// Per-email send throttle: how many codes were requested since `sinceIso`.
export async function recentVerificationCount(env, email, sinceIso) {
  const row = await env.DB.prepare(
    `SELECT count(*) AS n FROM email_verifications WHERE email = ? AND created_at >= ?`
  )
    .bind(email, sinceIso)
    .first();
  return row?.n || 0;
}

// ── Daily caps (counted from successfully persisted plans) ──
export async function countPlansForEmailSince(env, email, sinceIso) {
  const row = await env.DB.prepare(
    `SELECT count(*) AS n FROM plans WHERE email = ? AND created_at >= ?`
  )
    .bind(email, sinceIso)
    .first();
  return row?.n || 0;
}

export async function countPlansSince(env, sinceIso) {
  const row = await env.DB.prepare(`SELECT count(*) AS n FROM plans WHERE created_at >= ?`)
    .bind(sinceIso)
    .first();
  return row?.n || 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/db.js
git commit -m "Add D1 helpers for verifications, daily caps, and plan email"
```

---

## Task 7: Schema + migration

**Files:**
- Modify: `schema.sql`
- Create: `migrations/2026-06-15-email-gate.sql`
- Modify: `package.json`

- [ ] **Step 1: Update `schema.sql`**

In the `plans` CREATE TABLE (lines 10-19), add an `email` column as the final column:

```sql
CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY,
  business_type   TEXT NOT NULL,
  pain_points     TEXT NOT NULL,            -- JSON array of strings
  team_size       TEXT,
  budget          TEXT,
  extra_context   TEXT,
  recommendations TEXT NOT NULL,            -- JSON object (the generated plan)
  created_at      TEXT NOT NULL,
  email           TEXT                      -- verified owner email (added 2026-06-15)
);
```

Replace the reserved `tasks` table block (lines 34-44) with the verification table:

```sql
-- Email verification codes for plan generation. Raw codes are never stored — only a
-- peppered SHA-256 hash. Rows are single-use (consumed_at) and short-lived (expires_at).
CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);
```

Add to the index block at the bottom (after line 60):

```sql
CREATE INDEX IF NOT EXISTS idx_plans_email ON plans(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
```

- [ ] **Step 2: Create the one-time migration for the live DB**

`schema.sql` uses `CREATE TABLE IF NOT EXISTS`, which cannot add a column to the existing prod `plans` table — so the live DB needs an explicit `ALTER`.

```sql
-- migrations/2026-06-15-email-gate.sql
-- One-time migration for the already-provisioned `visions` D1. Run once per environment:
--   npm run db:migrate:local   (or :remote)
-- ALTER ... ADD COLUMN errors if the column already exists; safe to ignore on re-run.

ALTER TABLE plans ADD COLUMN email TEXT;

CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_email ON plans(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- The task board is removed; this reserved table was never written to.
DROP TABLE IF EXISTS tasks;
```

- [ ] **Step 3: Add migration scripts to `package.json`**

Add these two entries to the `scripts` block (after the `db:schema:remote` line):

```json
    "db:migrate:local": "wrangler d1 execute visions --local --file=./migrations/2026-06-15-email-gate.sql",
    "db:migrate:remote": "wrangler d1 execute visions --remote --file=./migrations/2026-06-15-email-gate.sql"
```

- [ ] **Step 4: Apply to the local DB**

Run: `npm run db:migrate:local`
Expected: completes; if the local DB predates this work and already lacks the column it adds cleanly. (A fresh local DB created via `npm run db:schema:local` already has the column — the `ALTER` then errors harmlessly; that's expected.)

- [ ] **Step 5: Commit**

```bash
git add schema.sql migrations/2026-06-15-email-gate.sql package.json
git commit -m "Schema: add email column + email_verifications, drop tasks"
```

---

## Task 8: verify/start and verify/check handlers

**Files:**
- Create: `worker/src/handlers/verifyStart.js`
- Create: `worker/src/handlers/verifyCheck.js`

- [ ] **Step 1: Write `verifyStart.js`**

```js
// worker/src/handlers/verifyStart.js
import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateVerifyStart } from "../lib/validate.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { generateCode, hashCode } from "../lib/code.js";
import { insertVerification, recentVerificationCount } from "../lib/db.js";
import { sendVerifyCodeEmail } from "../lib/email.js";
import { newId } from "../lib/ids.js";

// POST /api/verify/start — Turnstile-gated. Emails a 6-digit code (or echoes it in dev).
export async function verifyStartHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateVerifyStart(body);
  if (invalid) return error(invalid, 400);

  await verifyTurnstile(env, body?.turnstileToken, request.headers.get("CF-Connecting-IP"));

  const email = body.email.trim().toLowerCase();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Per-email throttle: at most one code per 60 seconds.
  const since = new Date(nowMs - 60_000).toISOString();
  if ((await recentVerificationCount(env, email, since)) > 0) {
    return error("Please wait a moment before requesting another code.", 429);
  }

  const code = generateCode();
  const ttlMin = Number(env.VERIFY_CODE_TTL_MIN || 10);
  const expiresAt = new Date(nowMs + ttlMin * 60_000).toISOString();
  const codeHash = await hashCode(env.VERIFY_CODE_PEPPER, email, code);
  await insertVerification(env, { id: newId(), email, codeHash, expiresAt, createdAt: nowIso });

  try {
    await sendVerifyCodeEmail(env, email, code);
  } catch (e) {
    console.error("Verify code email failed:", e);
    if (env.VERIFY_DEV_ECHO !== "true") {
      throw new ApiError("We couldn't send your code. Please try again.", 503);
    }
  }

  const res = { ok: true };
  if (env.VERIFY_DEV_ECHO === "true") res.devCode = code; // dev only — never set in prod
  return json(res);
}
```

- [ ] **Step 2: Write `verifyCheck.js`**

```js
// worker/src/handlers/verifyCheck.js
import { json, error } from "../lib/http.js";
import { validateVerifyCheck } from "../lib/validate.js";
import { hashCode } from "../lib/code.js";
import {
  latestActiveVerification,
  incrementVerificationAttempts,
  consumeVerification,
} from "../lib/db.js";
import { signVerifyToken } from "../lib/verifyToken.js";

const MAX_ATTEMPTS = 5;

// POST /api/verify/check — validates a code, returns a short-lived verification token.
export async function verifyCheckHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateVerifyCheck(body);
  if (invalid) return error(invalid, 400);

  const email = body.email.trim().toLowerCase();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const row = await latestActiveVerification(env, email, nowIso);
  if (!row) return error("That code has expired. Please request a new one.", 400);
  if (row.attempts >= MAX_ATTEMPTS) {
    return error("Too many attempts. Please request a new code.", 429);
  }

  await incrementVerificationAttempts(env, row.id);
  const provided = await hashCode(env.VERIFY_CODE_PEPPER, email, body.code.trim());
  if (provided !== row.code_hash) {
    return error("That code isn't right. Please try again.", 400);
  }

  await consumeVerification(env, row.id, nowIso);
  const ttlMin = Number(env.VERIFY_TOKEN_TTL_MIN || 30);
  const token = await signVerifyToken(env.VERIFY_TOKEN_SECRET, email, ttlMin, nowMs);
  return json({ token });
}
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/handlers/verifyStart.js worker/src/handlers/verifyCheck.js
git commit -m "Add verify/start + verify/check handlers"
```

---

## Task 9: Router + dispatch + rate limits + Turnstile move

**Files:**
- Modify: `worker/src/lib/router.js`
- Test: `worker/test/router.test.js`
- Modify: `worker/src/index.js`

- [ ] **Step 1: Add failing router test cases**

Append to `worker/test/router.test.js`:

```js
test("routes the verify endpoints", () => {
  assert.deepEqual(resolveRoute("POST", "/api/verify/start"), { name: "verifyStart" });
  assert.deepEqual(resolveRoute("POST", "/api/verify/check"), { name: "verifyCheck" });
  assert.equal(resolveRoute("GET", "/api/verify/start"), null);
});
```

(If `resolveRoute` isn't already imported at the top of that file, add `import { resolveRoute } from "../src/lib/router.js";`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/router.test.js`
Expected: FAIL — verify routes return `null`.

- [ ] **Step 3: Add routes to `worker/src/lib/router.js`**

Add before the final `return null;` (line 12):

```js
  if (method === "POST" && pathname === "/api/verify/start") return { name: "verifyStart" };
  if (method === "POST" && pathname === "/api/verify/check") return { name: "verifyCheck" };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/router.test.js`
Expected: PASS.

- [ ] **Step 5: Wire dispatch + rate limits in `worker/src/index.js`**

Add the two handler imports after the existing handler imports (line 12):

```js
import { verifyStartHandler } from "./handlers/verifyStart.js";
import { verifyCheckHandler } from "./handlers/verifyCheck.js";
```

Add verify-endpoint rate limiting alongside the existing blocks (after line 31):

```js
    if (route.name === "verifyStart" && env.VERIFY_START_RATE_LIMITER) {
      const { success } = await env.VERIFY_START_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
    if (route.name === "verifyCheck" && env.VERIFY_CHECK_RATE_LIMITER) {
      const { success } = await env.VERIFY_CHECK_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
```

Update the dispatch switch: change the `plan` case to pass `ctx`, and add the two verify cases:

```js
        case "plan":
          return await planHandler(request, env, ctx);
        case "verifyStart":
          return await verifyStartHandler(request, env);
        case "verifyCheck":
          return await verifyCheckHandler(request, env);
```

- [ ] **Step 6: Commit**

```bash
git add worker/src/lib/router.js worker/test/router.test.js worker/src/index.js
git commit -m "Route + dispatch verify endpoints; pass ctx to plan; rate-limit verify"
```

---

## Task 10: Plan handler — require token, enforce caps, email the plan

**Files:**
- Modify: `worker/src/handlers/plan.js`

- [ ] **Step 1: Replace `worker/src/handlers/plan.js` entirely**

```js
import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateProfile, normalizeProfile } from "../lib/validate.js";
import { buildPlanRequest, buildPlanMessage } from "../lib/prompts.js";
import { callMessages, extractText, parseJsonText } from "../lib/anthropic.js";
import { runAgent } from "../lib/agents.js";
import { verifyVerifyToken } from "../lib/verifyToken.js";
import {
  insertPlan,
  countPlansForEmailSince,
  countPlansSince,
  startOfUtcDayIso,
} from "../lib/db.js";
import { sendPlanEmail } from "../lib/email.js";
import { newId } from "../lib/ids.js";

// POST /api/plan — requires a verification token (obtained via /api/verify/check after
// Turnstile), enforces the per-email + global daily caps, generates + persists the plan,
// and emails it to the verified address.
export async function planHandler(request, env, ctx) {
  const body = await readJson(request);
  const invalid = validateProfile(body);
  if (invalid) return error(invalid, 400);

  // Email-verification gate (replaces Turnstile here; Turnstile now guards verify/start).
  const { valid, email } = await verifyVerifyToken(
    env.VERIFY_TOKEN_SECRET,
    body?.verifyToken,
    Date.now()
  );
  if (!valid) {
    throw new ApiError("Email verification required. Please verify your email and try again.", 401);
  }

  // Daily caps — the hard ceiling on token spend.
  const dayStart = startOfUtcDayIso(Date.now());
  const perEmailCap = Number(env.PER_EMAIL_DAILY_CAP || 3);
  const globalCap = Number(env.GLOBAL_DAILY_PLAN_CAP || 200);
  if ((await countPlansForEmailSince(env, email, dayStart)) >= perEmailCap) {
    throw new ApiError(
      `You've reached today's limit of ${perEmailCap} plans for this email. Try again tomorrow.`,
      429
    );
  }
  if ((await countPlansSince(env, dayStart)) >= globalCap) {
    throw new ApiError("We've hit today's capacity. Please check back tomorrow.", 429);
  }

  const profile = normalizeProfile(body);

  let rawText;
  if (env.USE_MANAGED_AGENT === "true") {
    rawText = await runAgent(env, buildPlanMessage(profile));
  } else {
    rawText = extractText(await callMessages(env, buildPlanRequest(profile, env)));
  }

  let plan;
  try {
    plan = parseJsonText(rawText);
  } catch {
    throw new ApiError("The AI returned an unreadable plan. Please try again.", 502);
  }
  if (!plan?.headline || !Array.isArray(plan.quick_wins)) {
    throw new ApiError("The AI returned an incomplete plan. Please try again.", 502);
  }

  const id = newId();
  await insertPlan(env, { id, profile, recommendations: plan, email });

  // Email the plan to the verified address; a send failure must never fail the response.
  const deliver = sendPlanEmail(env, email, plan, id).catch((e) =>
    console.error("Plan email failed:", e)
  );
  if (ctx?.waitUntil) ctx.waitUntil(deliver);

  return json({ id, plan });
}
```

- [ ] **Step 2: Run the full backend test suite (nothing should regress)**

Run: `npm test`
Expected: PASS — all suites green (router, validate, prompts, anthropic, agents, verifyToken, code, email, dates).

- [ ] **Step 3: Commit**

```bash
git add worker/src/handlers/plan.js
git commit -m "Gate /api/plan on verified email + daily caps; email the plan"
```

---

## Task 11: wrangler.toml + .dev.vars config

**Files:**
- Modify: `wrangler.toml`
- Modify: `.dev.vars.example`

- [ ] **Step 1: Add vars to the `[vars]` block in `wrangler.toml`**

Add after the existing `USE_MANAGED_AGENT`/`AGENT_*` lines (these are non-secret; secrets are set separately in Task 18):

```toml
# Email-verification gate + cost caps.
VERIFY_EMAIL_FROM = "plans@l8ti.com"   # FROM for code + plan emails (must be on the onboarded domain)
SITE_URL = "https://l8ti.com"          # base for /plan/:id links in the plan email
GLOBAL_DAILY_PLAN_CAP = "200"          # hard ceiling (~$10/day at ~$0.05/plan)
PER_EMAIL_DAILY_CAP = "3"
VERIFY_CODE_TTL_MIN = "10"
VERIFY_TOKEN_TTL_MIN = "30"
```

- [ ] **Step 2: Add the two verify rate-limit bindings to `wrangler.toml`**

Add after the existing `CHAT_RATE_LIMITER` block (use fresh `namespace_id`s):

```toml
[[ratelimits]]
name = "VERIFY_START_RATE_LIMITER"
namespace_id = "1003"

  [ratelimits.simple]
  limit = 5
  period = 60

[[ratelimits]]
name = "VERIFY_CHECK_RATE_LIMITER"
namespace_id = "1004"

  [ratelimits.simple]
  limit = 10
  period = 60
```

- [ ] **Step 3: Document dev secrets/flags in `.dev.vars.example`**

Append:

```
# Email-verification gate (local dev).
VERIFY_TOKEN_SECRET=dev-verify-token-secret-change-me
VERIFY_CODE_PEPPER=dev-code-pepper-change-me
# Echo the 6-digit code in the verify/start response instead of emailing it (DEV ONLY).
VERIFY_DEV_ECHO=true
```

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml .dev.vars.example
git commit -m "Config: verify-gate vars, caps, and rate-limit bindings"
```

---

## Task 12: Frontend API client

**Files:**
- Modify: `src/lib/api.js`

- [ ] **Step 1: Add verification calls and update `generatePlan`**

Replace `generatePlan` (lines 26-34) with:

```js
// Step 1 of the gate: request a 6-digit code (Turnstile-gated server-side). In mock mode
// it returns a fake devCode so `npm run dev` needs no backend/email.
export async function startVerification(email, turnstileToken) {
  if (USE_MOCK) {
    await delay(400);
    return { ok: true, devCode: "000000" };
  }
  return postJson("/api/verify/start", { email, turnstileToken });
}

// Step 2: exchange email + code for a short-lived verification token. Mock accepts anything.
export async function checkVerification(email, code) {
  if (USE_MOCK) {
    await delay(400);
    return { token: "mock-verify-token" };
  }
  return postJson("/api/verify/check", { email, code });
}

// Generate + persist a plan. Returns { id, plan }. The verifyToken proves email verification
// (replaces the old Turnstile token here); ignored in mock mode.
export async function generatePlan(profile, verifyToken) {
  if (USE_MOCK) {
    await delay(900);
    return { id: mockId(), plan: mockPlan(profile) };
  }
  return postJson("/api/plan", { ...profile, verifyToken });
}
```

- [ ] **Step 2: Verify the dev build still compiles**

Run: `npm run build`
Expected: build succeeds (no references resolved yet to the new functions — they're exports).

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "Frontend API: startVerification, checkVerification, token-based generatePlan"
```

---

## Task 13: EmailVerifyStep component

**Files:**
- Create: `src/components/intake/EmailVerifyStep.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/intake/EmailVerifyStep.jsx
import { useState } from "react";
import { ProgressDots } from "./ProgressDots.jsx";
import { Button } from "../ui/Button.jsx";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile.jsx";
import { startVerification, checkVerification } from "../../lib/api.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Step 4: capture + verify the owner's email before spending tokens on generation. On a
// valid code it hands a verification token up via onVerified(token).
export function EmailVerifyStep({ onBack, onVerified }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [devCode, setDevCode] = useState(null);

  const needsToken = Boolean(TURNSTILE_SITE_KEY);
  const emailValid = EMAIL_RE.test(email.trim());
  const canSend = emailValid && (!needsToken || Boolean(turnstileToken)) && !busy;
  const canVerify = /^\d{6}$/.test(code.trim()) && !busy;

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startVerification(email.trim(), turnstileToken);
      setSent(true);
      setDevCode(res?.devCode || null);
    } catch {
      setError("We couldn't send your code. Please try again.");
    } finally {
      setBusy(false);
      setTurnstileToken(""); // single-use
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await checkVerification(email.trim(), code.trim());
      if (!token) throw new Error("no token");
      onVerified(token);
    } catch {
      setError("That code isn't right or has expired. Try again, or resend a new code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="[animation:vfade_.4s_ease_both]">
      <ProgressDots step={3} />
      <h2 className="m-0 mb-[7px] text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.02em]">
        Where should we send your plan?
      </h2>
      <p className="m-0 mb-[26px] text-[15px] text-brand-slate">
        Verify your email and we'll show your plan here and send a copy to your inbox.
      </p>

      <label htmlFor="v-email" className="mb-2.5 block text-[14px] font-bold">
        Email
      </label>
      <input
        id="v-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sent}
        placeholder="you@yourbusiness.com"
        className="w-full rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[15px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)] disabled:bg-[#f6f4f0]"
      />

      {!sent && <Turnstile onVerify={setTurnstileToken} />}

      {sent && (
        <div className="mt-[18px]">
          <label htmlFor="v-code" className="mb-2.5 block text-[14px] font-bold">
            6-digit code{" "}
            <span className="font-medium text-[#9aa7b1]">(sent to {email.trim()})</span>
          </label>
          <input
            id="v-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && canVerify && verify()}
            placeholder="123456"
            className="w-full rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[18px] tracking-[0.3em] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
          />
          <button
            onClick={sendCode}
            disabled={!canSend}
            className="mt-2.5 text-[13px] font-semibold text-brand-ocean underline disabled:opacity-50"
          >
            Resend code
          </button>
          {devCode && (
            <p className="mt-2 text-[12px] text-[#9aa7b1]">Dev code: {devCode}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[14px] font-semibold text-brand-coral">{error}</p>}

      <div className="mt-[34px] flex justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          ← Back
        </Button>
        {sent ? (
          <Button disabled={!canVerify} onClick={verify}>
            Verify &amp; see my plan →
          </Button>
        ) : (
          <Button disabled={!canSend} onClick={sendCode}>
            Send code →
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/intake/EmailVerifyStep.jsx
git commit -m "Add EmailVerifyStep (email capture + 6-digit code)"
```

---

## Task 14: Wire the verify step into AdvisorFlow + remove tasks

**Files:**
- Modify: `src/pages/AdvisorFlow.jsx`

- [ ] **Step 1: Update imports (top of file, lines 1-12)**

Remove the `storage` import (line 3) and the `buildPlanTasks` import (line 6). Add the new step import. Result:

```jsx
import { useEffect, useState } from "react";
import { MAX_PAIN_POINTS } from "../data/intake.js";
import { buildProfile } from "../lib/profile.js";
import { generatePlan } from "../lib/api.js";
import { Landing } from "../components/Landing.jsx";
import { PageShell } from "../components/Layout.jsx";
import { BusinessTypeStep } from "../components/intake/BusinessTypeStep.jsx";
import { PainPointsStep } from "../components/intake/PainPointsStep.jsx";
import { DetailsStep } from "../components/intake/DetailsStep.jsx";
import { EmailVerifyStep } from "../components/intake/EmailVerifyStep.jsx";
import { ResultsView } from "../components/results/ResultsView.jsx";
```

(Keep `useEffect` import even though the tasks effect is removed — it remains imported only if used elsewhere; since it is no longer used after Step 3, change line 1 to `import { useState } from "react";`.)

- [ ] **Step 2: Remove the `TASKS_KEY` constant (line 14) and tasks/turnstile state**

Delete `const TASKS_KEY = "tasks";`. In the state block, replace `turnstileToken` with `verifyToken`, and delete the `tasks` state and the tasks-loading `useEffect` (lines 38, 42-53). The state block becomes:

```jsx
  // Plan
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null); // snapshot used by results + chat
  const [planId, setPlanId] = useState(null);
  const [verifyToken, setVerifyToken] = useState(""); // from EmailVerifyStep

  // Results
  const [activeTab, setActiveTab] = useState("plan");
  const [planSaved, setPlanSaved] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
```

- [ ] **Step 3: Update `getRecommendations` to take the token and advance to step 5**

Replace `getRecommendations` (lines 68-98) with:

```jsx
  const getRecommendations = async (token) => {
    const snapshot = buildProfile({
      businessType,
      otherType,
      painPoints,
      teamSize,
      budget,
      extraContext,
    });
    setProfile(snapshot);
    setLoading(true);
    setError(null);
    setPlanId(null);
    setPlanSaved(false);
    setStep(5);
    setActiveTab("plan");

    try {
      const { id, plan } = await generatePlan(snapshot, token || verifyToken);
      if (!plan?.headline || !plan?.quick_wins) throw new Error("Incomplete response");
      setRecommendations(plan);
      setPlanId(id);
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Something went wrong generating your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Remove `addTasksFromPlan` (lines 111-116) and update `restart`**

Delete the `addTasksFromPlan` function. In `restart` (lines 118-134), replace `setTurnstileToken("")` with `setVerifyToken("")`. (No tasks state to reset.)

- [ ] **Step 5: Update the DetailsStep render + add the EmailVerifyStep render**

In the `step === 3` block (lines 167-185), change `onSubmit` and drop the Turnstile props:

```jsx
  if (step === 3) {
    return (
      <PageShell width="narrow" onHome={restart}>
        <DetailsStep
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          budget={budget}
          setBudget={setBudget}
          extraContext={extraContext}
          setExtraContext={setExtraContext}
          canAdvance={canAdvanceStep3}
          onBack={() => setStep(2)}
          onSubmit={() => setStep(4)}
        />
      </PageShell>
    );
  }

  if (step === 4) {
    return (
      <PageShell width="narrow" onHome={restart}>
        <EmailVerifyStep
          onBack={() => setStep(3)}
          onVerified={(token) => {
            setVerifyToken(token);
            getRecommendations(token);
          }}
        />
      </PageShell>
    );
  }
```

- [ ] **Step 6: Update the results render (final `return`, lines 187-208)**

Change `onRetry` to return to the verify step and remove the tasks props:

```jsx
  return (
    <ResultsView
      loading={loading}
      error={error}
      onRetry={() => setStep(4)}
      recommendations={recommendations}
      profile={profile}
      businessLabel={profile?.businessType || ""}
      onRestart={restart}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSavePlan={savePlan}
      planSaved={planSaved}
      shareUrl={shareUrl}
      planId={planId}
      showBooking={showBooking}
      setShowBooking={setShowBooking}
    />
  );
```

- [ ] **Step 7: Commit (build verified after Task 15, which removes the props ResultsView still expects)**

```bash
git add src/pages/AdvisorFlow.jsx
git commit -m "Insert email-verify step into AdvisorFlow; drop task state"
```

---

## Task 15: Remove tasks from ResultsView + PlanView

**Files:**
- Modify: `src/components/results/ResultsView.jsx`
- Modify: `src/components/results/PlanView.jsx`

- [ ] **Step 1: Update `ResultsView.jsx`**

Remove the `TaskBoard` import (line 4). Drop the `tasks` tab from `TABS` (lines 8-12):

```jsx
const TABS = [
  { id: "plan", label: "AI Plan" },
  { id: "experts", label: "Experts" },
];
```

Remove `tasks`, `setTasks`, and `onAddTasks` from the destructured props (lines 26-28). Remove the tasks tab render (line 94). Update the `PlanView` render to drop `onAddTasks` (lines 81-92 → remove the `onAddTasks={onAddTasks}` prop).

- [ ] **Step 2: Update `PlanView.jsx`**

Remove `onAddTasks` from the props (line 10). Remove the "＋ Add to Tasks" button from the action bar (lines 51-56). Remove the "＋ Add this week to tasks" button inside the "This Week" card (lines 164-169). Keep the "Save & Share" and "Book a Consultation" buttons and the `win.task` "Action:" callout (lines 102-109) untouched.

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/results/ResultsView.jsx src/components/results/PlanView.jsx
git commit -m "Remove tasks tab + add-to-tasks buttons from results"
```

---

## Task 16: Remove tasks from SharedPlan

**Files:**
- Modify: `src/pages/SharedPlan.jsx`

- [ ] **Step 1: Strip task wiring**

Remove the `storage` import (line 4) and `buildPlanTasks` import (line 5). Delete `const TASKS_KEY = "tasks";` (line 8). Remove the `tasks` state (line 20). Remove the tasks-loading IIFE inside the effect (lines 28-37, the first `(async () => {...})()`), keeping the plan-loading IIFE and the `active` cleanup. Delete `addTasksFromPlan` (lines 58-63). In the `ResultsView` render, remove the `tasks`, `setTasks`, and `onAddTasks` props (lines 86-88).

The resulting effect keeps only:

```jsx
  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPlan(id);
        if (active) setRecord(data);
      } catch {
        if (active)
          setError("We couldn't load that plan. The link may be incorrect or expired.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SharedPlan.jsx
git commit -m "Remove task wiring from SharedPlan"
```

---

## Task 17: Delete dead task files

**Files:**
- Delete: `src/components/results/TaskBoard.jsx`, `src/lib/tasks.js`, `src/lib/storage.js`

- [ ] **Step 1: Confirm nothing else imports them**

Run: `grep -rn "TaskBoard\|lib/tasks\|lib/storage\|buildPlanTasks" src`
Expected: no matches (all removed in Tasks 14-16). If any remain, fix them before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/results/TaskBoard.jsx src/lib/tasks.js src/lib/storage.js
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git commit -m "Delete task board, tasks lib, and localStorage shim"
```

---

## Task 18: Migrate, configure, and end-to-end verify

**Files:** none (ops + manual verification). Do not commit secrets.

- [ ] **Step 1: Apply the migration to production D1**

Run: `npm run db:migrate:remote`
Expected: `ALTER TABLE` + table/index creation succeed; `DROP TABLE IF EXISTS tasks` runs.

- [ ] **Step 2: Set the server secrets**

```bash
wrangler secret put VERIFY_TOKEN_SECRET   # paste a long random string
wrangler secret put VERIFY_CODE_PEPPER    # paste a different long random string
```

- [ ] **Step 3: Onboard l8ti.com to Email Sending (prerequisite for delivery)**

In the Cloudflare dashboard: Compute → Email Service → Email Sending → Onboard Domain (l8ti.com), and confirm `plans@l8ti.com` (the `VERIFY_EMAIL_FROM`) can send. Until this is done, codes won't deliver in prod.

- [ ] **Step 4: Local end-to-end smoke test**

```bash
cp .dev.vars.example .dev.vars   # if not already present; keep VERIFY_DEV_ECHO=true
npm run db:migrate:local
npm run build
npm run worker:dev
```

Then, against `http://localhost:8787`:

```bash
# 1) Request a code (dev echo returns it)
curl -s localhost:8787/api/verify/start -H 'Content-Type: application/json' \
  -d '{"email":"owner@biz.com","turnstileToken":"x"}'
# Expect: {"ok":true,"devCode":"NNNNNN"}   (turnstile may 403 if TURNSTILE_SECRET_KEY is set locally)

# 2) Exchange the code for a token
curl -s localhost:8787/api/verify/check -H 'Content-Type: application/json' \
  -d '{"email":"owner@biz.com","code":"NNNNNN"}'
# Expect: {"token":"...."}

# 3) Generate with the token
curl -s localhost:8787/api/plan -H 'Content-Type: application/json' \
  -d '{"businessType":"Cafe","painPoints":["Leads"],"teamSize":"2-5","budget":"<$100","verifyToken":"...."}'
# Expect: {"id":"...","plan":{...}}

# 4) Token required: omit it → 401
curl -s -o /dev/null -w "%{http_code}\n" localhost:8787/api/plan \
  -H 'Content-Type: application/json' -d '{"businessType":"Cafe","painPoints":["Leads"]}'
# Expect: 401
```

- [ ] **Step 5: Deploy**

Run: `npm run deploy`
Expected: build + `wrangler deploy` succeed; the new vars/ratelimits appear in the deploy summary.

- [ ] **Step 6: Rotate the Turnstile secret (outstanding follow-up)**

Rotate the Turnstile secret key in the dashboard and `wrangler secret put TURNSTILE_SECRET_KEY`, since it was shared during earlier setup.

- [ ] **Step 7: Update CLAUDE.md**

Mark the email-gate + caps work done under Phase 1, note tasks removed, and update the API contract table to add `/api/verify/start` + `/api/verify/check` and the `verifyToken` field on `/api/plan`. Commit:

```bash
git add CLAUDE.md
git commit -m "Docs: email-gate + caps; remove tasks; verify endpoints in API contract"
```

---

## Self-Review

**Spec coverage:**
- Global + per-email caps → Tasks 6, 10. ✓
- Turnstile moved to verify/start → Tasks 8, 10 (removed from plan), 9. ✓
- Inline 6-digit code (start/check) → Tasks 2, 8, 13. ✓
- Stateless verify token → Tasks 1, 10. ✓
- email_verifications table + plans.email + drop tasks → Task 7. ✓
- Plan emailed (non-fatal) + code email (awaited) → Tasks 4, 8, 10. ✓
- Dev echo for local testing → Tasks 8, 11, 18. ✓
- Per-email send throttle + 5-attempt cap → Tasks 6, 8. ✓
- Rate limits on verify endpoints → Tasks 9, 11. ✓
- Remove tasks (board, lib, storage, tab, buttons, table) → Tasks 14-17, 7. ✓
- Config/secrets/vars → Tasks 11, 18. ✓
- Tests for pure libs → Tasks 1-5. ✓
- Email Sending onboarding + Turnstile rotation prereqs → Task 18. ✓
- Error-handling table (401/429/400/503) → Tasks 8, 10, 13. ✓

**Deviation:** keeping `quick_wins[].task` (rendered as the per-win "Action:" in PlanView) instead of the spec's optional schema cleanup — documented in File Structure.

**Type/name consistency:** `signVerifyToken`/`verifyVerifyToken`, `generateCode`/`hashCode`, `startOfUtcDayIso`, `insertVerification`/`latestActiveVerification`/`incrementVerificationAttempts`/`consumeVerification`/`recentVerificationCount`, `countPlansForEmailSince`/`countPlansSince`, `buildVerifyCodeEmail`/`sendVerifyCodeEmail`/`buildPlanEmail`/`sendPlanEmail`, `startVerification`/`checkVerification`/`generatePlan(profile, verifyToken)` — all used consistently across tasks. Env names (`VERIFY_TOKEN_SECRET`, `VERIFY_CODE_PEPPER`, `VERIFY_EMAIL_FROM`, `SITE_URL`, `GLOBAL_DAILY_PLAN_CAP`, `PER_EMAIL_DAILY_CAP`, `VERIFY_CODE_TTL_MIN`, `VERIFY_TOKEN_TTL_MIN`, `VERIFY_DEV_ECHO`, `VERIFY_START_RATE_LIMITER`, `VERIFY_CHECK_RATE_LIMITER`) consistent between handlers, config, and tests.
