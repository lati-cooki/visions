# Visions → l8ti.com Cutover & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Visions, harden its public API (Turnstile + rate limit + booking email), then put it on the `l8ti.com` apex while relocating Sobriety Pursuit to `sp.l8ti.com`.

**Architecture:** Two independent Cloudflare Workers — `visions` (new, apex) and `l8ticom` (existing, moves to `sp.l8ti.com`, code unchanged). Visions uses the Messages API path (`USE_MANAGED_AGENT="false"`) with structured outputs. Hardening lives in the zero-dependency Worker as pure helpers (unit-tested with `node --test`) plus thin fetch/binding wrappers.

**Tech Stack:** Vite + React + Tailwind frontend; zero-dependency ESM Cloudflare Worker; D1; Cloudflare Turnstile; Workers rate-limit binding; Cloudflare Email.

**Spec:** `docs/superpowers/specs/2026-06-15-l8ti-cutover-design.md`

---

## File map

- Modify `wrangler.toml` — flip `USE_MANAGED_AGENT`; add rate-limit binding; add email binding; add Turnstile note.
- Create `worker/src/lib/turnstile.js` — siteverify (pure body builder + fetch wrapper).
- Create `worker/test/turnstile.test.js` — tests for the pure builder.
- Create `worker/src/lib/email.js` — pure booking-email composer + send wrapper.
- Create `worker/test/email.test.js` — tests for the composer.
- Modify `worker/src/handlers/plan.js` — verify Turnstile before generating.
- Modify `worker/src/handlers/booking.js` — send owner email after the D1 write (non-fatal).
- Modify `worker/src/index.js` — apply rate limit to `/api/plan` + `/api/chat`; thread `ctx`.
- Modify `src/lib/api.js` — send the Turnstile token with the plan request.
- Modify `src/pages/AdvisorFlow.jsx` + `src/components/intake/DetailsStep.jsx` — render the widget, gate submit on a token.
- Modify `.env.production` / `.env.example` / `.dev.vars.example` — Turnstile site key (client) + secret (Worker).

---

## Phase A — Deploy & verify (workers.dev, no public traffic)

### Task 1: Repo prep — Messages API path
**Files:** Modify `wrangler.toml`

- [ ] **Step 1:** Set `USE_MANAGED_AGENT = "false"`. Leave `AGENT_ID`/`AGENT_ENV_ID` in place (dormant, harmless) so the agent path remains a one-line flip later.
- [ ] **Step 2:** `npm install`
- [ ] **Step 3:** `npm test` — Expected: all suites pass (~21 tests).
- [ ] **Step 4:** `npm run build` — Expected: `dist/` produced, no errors.
- [ ] **Step 5:** Commit: `git add wrangler.toml && git commit -m "Use Messages API path for plan generation"`

### Task 2: Set secret + first deploy (workers.dev only)
**Files:** none (ops). **Blocking input:** `ANTHROPIC_API_KEY` for the Visions workspace.

- [ ] **Step 1:** `wrangler whoami` — confirm the right Cloudflare account.
- [ ] **Step 2:** `wrangler secret put ANTHROPIC_API_KEY` (user pastes the key).
- [ ] **Step 3:** `npm run db:schema:remote` — idempotent; confirms the `plans`/`bookings` tables exist (resolves the `num_tables:0` discrepancy).
- [ ] **Step 4:** `npm run deploy`. Expected: deployed to `https://visions.<account>.workers.dev`. **Do not** attach any l8ti.com hostname yet.

### Task 3: Smoke-test on workers.dev
**Files:** none (ops).

- [ ] **Step 1:** `curl https://visions.<account>.workers.dev/api/health` → `{"ok":true}`.
- [ ] **Step 2:** Open the workers.dev URL; run a full intake → confirm a plan renders.
- [ ] **Step 3:** `wrangler d1 execute visions --remote --command "SELECT count(*) FROM plans"` → count increased by 1.
- [ ] **Step 4:** Open the `/plan/:id` share link → the saved plan loads.
- [ ] **Step 5:** Submit a booking; `... "SELECT count(*) FROM bookings"` → increased by 1.

---

## Phase B — Hardening

### Task 4: Turnstile server verification
**Files:** Create `worker/src/lib/turnstile.js`, `worker/test/turnstile.test.js`; Modify `worker/src/handlers/plan.js`

- [ ] **Step 1: Write the failing test** — `worker/test/turnstile.test.js`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSiteverifyBody } from "../src/lib/turnstile.js";

test("buildSiteverifyBody includes secret, response, remoteip", () => {
  const body = buildSiteverifyBody("sek", "tok", "1.2.3.4");
  assert.equal(body.get("secret"), "sek");
  assert.equal(body.get("response"), "tok");
  assert.equal(body.get("remoteip"), "1.2.3.4");
});

test("buildSiteverifyBody omits remoteip when absent", () => {
  const body = buildSiteverifyBody("sek", "tok");
  assert.equal(body.has("remoteip"), false);
});
```
- [ ] **Step 2: Run, expect FAIL** — `npm test` → fails: cannot find `../src/lib/turnstile.js`.
- [ ] **Step 3: Implement** — `worker/src/lib/turnstile.js`
```js
import { ApiError } from "./http.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Pure: build the application/x-www-form-urlencoded body for siteverify.
export function buildSiteverifyBody(secret, token, remoteip) {
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteip) form.set("remoteip", remoteip);
  return form;
}

// Verify a Turnstile token. Resolves on success; throws ApiError otherwise.
export async function verifyTurnstile(env, token, remoteip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApiError("Server is not configured (missing TURNSTILE_SECRET_KEY).", 500);
  }
  if (typeof token !== "string" || !token) {
    throw new ApiError("Verification required.", 403);
  }
  let res;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: buildSiteverifyBody(env.TURNSTILE_SECRET_KEY, token, remoteip),
    });
  } catch {
    throw new ApiError("Could not verify the request.", 502);
  }
  const data = await res.json().catch(() => null);
  if (!data?.success) throw new ApiError("Verification failed. Please try again.", 403);
  return true;
}
```
- [ ] **Step 4: Run, expect PASS** — `npm test`.
- [ ] **Step 5: Wire into the handler** — `worker/src/handlers/plan.js`: import `verifyTurnstile`, and immediately after the `validateProfile` check insert:
```js
  await verifyTurnstile(env, body?.turnstileToken, request.headers.get("CF-Connecting-IP"));
```
(`validateProfile`/`normalizeProfile` ignore the extra `turnstileToken` field, so no other change is needed.)
- [ ] **Step 6: Run tests + build** — `npm test && npm run build`.
- [ ] **Step 7: Commit** — `git add worker && git commit -m "Verify Turnstile token before generating a plan"`

### Task 5: Turnstile widget on the client
**Files:** Modify `src/components/intake/DetailsStep.jsx`, `src/pages/AdvisorFlow.jsx`, `src/lib/api.js`, env files

> Use the **turnstile-spin** skill to create the widget in the Cloudflare dashboard/API (gets the site key + secret key) and to generate the canonical React snippet. Apply it as follows.

- [ ] **Step 1:** Create the Turnstile widget (turnstile-spin). Record the **site key** (public) and **secret key**.
- [ ] **Step 2:** Add env vars: `.env.production` → `VITE_TURNSTILE_SITE_KEY=<site key>`; `.env.example` documents it; for local dev use Cloudflare's always-pass test keys (site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`).
- [ ] **Step 3:** In `DetailsStep.jsx`, render the Turnstile widget (explicit render via the script API), store the token in local state, and pass it up; disable the submit button until a token exists. Pass the token through `onSubmit(token)`.
- [ ] **Step 4:** In `AdvisorFlow.jsx`, change `getRecommendations` to accept the token and pass it: `generatePlan(snapshot, token)`.
- [ ] **Step 5:** In `src/lib/api.js`, update `generatePlan(profile, turnstileToken)` to `postJson("/api/plan", { ...profile, turnstileToken })`. Mock mode ignores the token.
- [ ] **Step 6:** `npm run build` — Expected: clean build.
- [ ] **Step 7: Commit** — `git add src .env.* && git commit -m "Add Turnstile widget to the intake flow"`

### Task 6: Rate limiting on credit-spending endpoints
**Files:** Modify `wrangler.toml`, `worker/src/index.js`

> Confirm the current rate-limit binding syntax with the **wrangler** / **cloudflare** skill before editing (the binding is in active evolution).

- [ ] **Step 1:** Add a rate-limit binding to `wrangler.toml` (verify exact syntax via skill):
```toml
[[unsafe.bindings]]
name = "PLAN_RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 5, period = 60 }
```
- [ ] **Step 2:** In `worker/src/index.js`, after `resolveRoute` and before the `switch`, add:
```js
    if ((route.name === "plan" || route.name === "chat") && env.PLAN_RATE_LIMITER) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.PLAN_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
```
- [ ] **Step 3:** `npm test && npm run build`.
- [ ] **Step 4: Commit** — `git add wrangler.toml worker && git commit -m "Rate-limit /api/plan and /api/chat per IP"`

### Task 7: Booking email notification (Cloudflare Email)
**Files:** Create `worker/src/lib/email.js`, `worker/test/email.test.js`; Modify `worker/src/handlers/booking.js`, `worker/src/index.js`, `wrangler.toml`

> Use the **cloudflare-email-service** skill for the binding/MIME specifics and the required Cloudflare-side setup (verified sender/destination, DNS). **Blocking input:** the destination address for booking alerts.

- [ ] **Step 1: Write the failing test** — `worker/test/email.test.js`
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBookingEmail } from "../src/lib/email.js";

test("buildBookingEmail composes subject and body", () => {
  const msg = buildBookingEmail(
    { name: "Pat", email: "pat@x.com", phone: "", preferred: "morning", planId: "abc", message: "hi" },
    "owner@l8ti.com",
    "noreply@l8ti.com"
  );
  assert.equal(msg.to, "owner@l8ti.com");
  assert.equal(msg.from, "noreply@l8ti.com");
  assert.match(msg.subject, /Pat/);
  assert.match(msg.text, /pat@x\.com/);
  assert.match(msg.text, /morning/);
  assert.match(msg.text, /hi/);
});

test("buildBookingEmail omits empty optional fields", () => {
  const msg = buildBookingEmail(
    { name: "Pat", email: "pat@x.com", phone: "", preferred: "", planId: null, message: "" },
    "owner@l8ti.com",
    "noreply@l8ti.com"
  );
  assert.doesNotMatch(msg.text, /Phone:/);
  assert.match(msg.text, /\(no message\)/);
});
```
- [ ] **Step 2: Run, expect FAIL** — `npm test`.
- [ ] **Step 3: Implement the composer** — `worker/src/lib/email.js`
```js
// Pure: compose the owner-notification email for a booking.
export function buildBookingEmail(booking, to, from) {
  const subject = `New Visions booking: ${booking.name}`;
  const lines = [
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    booking.phone ? `Phone: ${booking.phone}` : null,
    booking.preferred ? `Preferred: ${booking.preferred}` : null,
    booking.planId ? `Plan: ${booking.planId}` : null,
    "",
    booking.message || "(no message)",
  ].filter((line) => line !== null);
  return { to, from, subject, text: lines.join("\n") };
}
```
- [ ] **Step 4: Run, expect PASS** — `npm test`.
- [ ] **Step 5: Add the send wrapper** (in `worker/src/lib/email.js`) using the Cloudflare email binding per the cloudflare-email-service skill. Signature: `async function sendBookingEmail(env, booking)` — reads `env.BOOKING_NOTIFY_TO` / `env.BOOKING_NOTIFY_FROM`, builds the message, sends via `env.SEND_EMAIL`. Returns nothing; the caller wraps it so failure is non-fatal.
- [ ] **Step 6: Wire into booking** — `worker/src/handlers/booking.js`: after `insertBooking`, before returning, fire the notification without letting it fail the booking:
```js
  ctx?.waitUntil?.(sendBookingEmail(env, { id, planId: ..., name: ..., email: ..., phone: ..., preferred: ..., message: ... }).catch((e) => console.error("Booking email failed:", e)));
```
- [ ] **Step 7: Thread `ctx`** — `worker/src/index.js`: change the handler to `async fetch(request, env, ctx)` and pass `ctx` to `bookingHandler(request, env, ctx)`; update `bookingHandler(request, env, ctx)` signature.
- [ ] **Step 8:** Add `wrangler.toml` email binding + `[vars]` `BOOKING_NOTIFY_TO`/`BOOKING_NOTIFY_FROM` per the skill; do the Cloudflare-side verification.
- [ ] **Step 9:** `npm test && npm run build`.
- [ ] **Step 10: Commit** — `git add worker wrangler.toml && git commit -m "Email the owner when a booking is captured"`

### Task 8: Redeploy hardened build + re-verify
**Files:** none (ops).

- [ ] **Step 1:** `wrangler secret put TURNSTILE_SECRET_KEY` (and confirm any email-side secret from the skill).
- [ ] **Step 2:** `npm run deploy`.
- [ ] **Step 3:** Re-run Task 3 smoke tests on workers.dev, plus: a plan request **without** a valid Turnstile token returns 403; rapid repeated `/api/plan` calls eventually return 429; a booking produces an owner email.

---

## Phase C — Domain cutover

### Task 9: Discover current routing, then move Sobriety Pursuit to sp.l8ti.com
**Files:** none (ops). **Outward-facing — confirm with user before each change.**

- [ ] **Step 1:** Discover how `l8ti.com` is currently bound to the `l8ticom` Worker: `wrangler deployments` / check Custom Domains + Routes for the zone (dashboard or `wrangler` / CF API). Report findings before changing anything.
- [ ] **Step 2:** Add `sp.l8ti.com` as a Custom Domain (or route) for the `l8ticom` Worker.
- [ ] **Step 3:** Verify `https://sp.l8ti.com` serves Sobriety Pursuit and `POST https://sp.l8ti.com/ia909` still works.

### Task 10: Cut the apex to Visions
**Files:** none (ops). **Outward-facing — confirm before flipping.**

- [ ] **Step 1:** Attach `l8ti.com` (+ `www.l8ti.com`) as Custom Domain(s) to the `visions` Worker, replacing the `l8ticom` binding on the apex.
- [ ] **Step 2:** Verify `https://l8ti.com/api/health` → `{ok:true}`; the UI loads; a plan persists; `/plan/:id` resolves; Turnstile + rate limit + booking email all behave.
- [ ] **Step 3:** Confirm Sobriety Pursuit still serves on `sp.l8ti.com` (apex move didn't disturb it).
- [ ] **Rollback if needed:** re-point the apex Custom Domain back to `l8ticom` (its code never changed).

### Task 11: Finish
- [ ] **Step 1:** `npm test` green; build clean; working tree committed.
- [ ] **Step 2:** Use the finishing-a-development-branch skill to decide merge to `main` / PR.
- [ ] **Step 3:** Update `CLAUDE.md` "remaining" checkboxes (deploy, hardening) to done.

---

## Self-review notes
- **Spec coverage:** end-state (Tasks 9–10), Messages API (Task 1), Turnstile (Tasks 4–5), rate limit (Task 6), booking email (Task 7), verify/rollback (Tasks 3, 8, 10) — all covered.
- **External-doc steps** (rate-limit binding syntax, Cloudflare email MIME/setup, Turnstile widget) are intentionally delegated to the wrangler/cloudflare-email-service/turnstile-spin skills rather than guessing syntax; each names the concrete edit to make after consulting.
- **Blocking inputs** are flagged inline: `ANTHROPIC_API_KEY` (Task 2), Turnstile keys (Task 5), booking-alert destination address (Task 7).
