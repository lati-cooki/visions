# Admin page (bookings + plans) — design

**Date:** 2026-06-15
**Owner:** Troy Latimer / Lati Cooki LLC
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

Booking leads and generated plans persist to D1, but there's no way to view them
short of raw `wrangler d1 execute` queries or the Cloudflare dashboard. The owner
wants a simple internal page to review consultation leads and plans, and to pull them
into a spreadsheet for their records.

## Goal

A read-only `/admin` page showing two tables — **bookings** (consultation leads) and
**plans** (everyone who generated a plan) — newest first, each with a CSV download.
Clicking a plan opens its existing shareable view. Protected by Cloudflare Access so
only the owner can reach it.

Non-goals: editing/deleting rows, pagination/search UI, charts/analytics, multi-user
roles, a bespoke plan-detail view (the public `/plan/:id` page is reused).

## Auth — Cloudflare Access + Worker JWT verification

Two layers:

1. **Edge (Cloudflare Access, Zero Trust).** A one-time, owner-performed dashboard step:
   create a **self-hosted Access application** whose paths cover `l8ti.com/admin*` and
   `l8ti.com/api/admin/*`, with a policy allowing the owner's email (Google or one-time
   PIN login). Cloudflare blocks unauthenticated requests to those paths at the edge —
   they never reach the Worker. The app's **Application Audience (AUD)** tag is copied
   into Worker config.

2. **Worker (defense-in-depth).** `worker/src/lib/access.js` verifies the
   `Cf-Access-Jwt-Assertion` header on every `/api/admin/*` request, so the admin API
   refuses even if the edge policy is ever misconfigured or a path slips coverage:
   - Fetch the team JWKS from `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`
     (cached in-memory across requests).
   - Verify the JWT's RS256 signature against the matching JWK (`kid`) via Web Crypto.
   - Check `aud` includes `ACCESS_AUD` and `exp` is in the future.
   - Missing/invalid token → **403**; JWKS fetch failure → **503** (fail closed).
   - `ACCESS_DEV_BYPASS="true"` (in `.dev.vars` only) skips verification for local
     `wrangler dev`; production never sets it.

Config (Worker `[vars]`): `ACCESS_TEAM_DOMAIN` (e.g. `laticooki.cloudflareaccess.com`),
`ACCESS_AUD` (the AUD tag). No secrets required — Access uses public-key JWTs.

## Backend

### Endpoints (all under the Access gate)

| Method + path                       | Returns                                                        |
|-------------------------------------|----------------------------------------------------------------|
| `GET /api/admin/bookings`           | `{ bookings: [...] }`, newest first                            |
| `GET /api/admin/bookings?format=csv`| `text/csv` + `Content-Disposition: attachment; filename=...`   |
| `GET /api/admin/plans`              | `{ plans: [...] }`, newest first (summary fields)              |
| `GET /api/admin/plans?format=csv`   | `text/csv` attachment                                          |

- **Bookings row:** `id, plan_id, name, email, phone, preferred_time, message, created_at`
  (the full `bookings` table).
- **Plans row (summary):** `id, business_type, email, team_size, budget, created_at,
  headline` (headline parsed from the stored `recommendations` JSON). The full plan
  content is intentionally *not* in the list — it's one click away at `/plan/:id`.

### New units

- `worker/src/lib/csv.js` — pure `toCsv(rows, columns)` serializer: emits a header row +
  one row per record, RFC-4180 quoting (wrap fields containing `"`, `,`, `\n`, or `\r`;
  double embedded quotes); `null`/`undefined` → empty cell. Unit-tested.
- `worker/src/lib/access.js` — `verifyAccessJwt(env, request)` → resolves the verified
  claims or throws `ApiError(403/503)`; honors `ACCESS_DEV_BYPASS`. JWKS fetch + cache +
  RS256 verify via Web Crypto. The claim checks (aud/exp) and JWKS caching are isolated
  so they're testable.
- `worker/src/lib/db.js` — `listBookings(env, limit=1000)` and `listPlans(env, limit=1000)`,
  ordered `created_at DESC`. `listPlans` parses each `recommendations` JSON to extract
  `headline` (falling back to `""` on parse failure).
- `worker/src/handlers/adminBookings.js` and `worker/src/handlers/adminPlans.js` — each
  verifies Access, lists from D1, and returns JSON or CSV based on `?format=csv`.

### Routing / dispatch

`router.js` gains `GET /api/admin/bookings` → `adminBookings` and `GET /api/admin/plans`
→ `adminPlans` (query string ignored in route matching; the handler reads `format`).
`index.js` dispatches them. Access verification lives in each handler (not a global
middleware) to keep the existing dispatch style.

## Frontend

- **Route:** add `<Route path="/admin" element={<AdminPage />} />` in `App.jsx`. The
  catch-all `*` → `/` redirect stays after it.
- **`src/pages/AdminPage.jsx`:** two tabs (Bookings / Plans). Each tab renders a
  read-only table (newest first) and a "Download CSV" button (a plain anchor to the
  `?format=csv` URL so the browser downloads it with the Access cookie attached). Plan
  rows link to `/plan/:id` (opens the existing shareable view). Loading / empty / error
  states. Reuses existing `PageShell`, `Button`, and table styling conventions.
- **`src/lib/api.js`:** `getAdminBookings()` and `getAdminPlans()` (GET + JSON). In
  **mock mode** they return representative sample rows from `mockData.js` so `npm run dev`
  renders the page without a backend or Access. CSV anchors point at the real API path
  (inert in pure-frontend mock, exercised under `wrangler dev`).

## Data flow

```
Browser (Access cookie) ─GET /api/admin/bookings─▶ Worker
  verifyAccessJwt(Cf-Access-Jwt-Assertion) ─ok─▶ listBookings(D1) ─▶ JSON ─▶ table
CSV button ─▶ <a href="/api/admin/bookings?format=csv"> ─▶ Worker ─▶ text/csv attachment
Plan row ─▶ <Link to="/plan/:id"> ─▶ existing SharedPlan view (public, already shareable)
```

## Error handling

| Condition                         | Result                                              |
|-----------------------------------|-----------------------------------------------------|
| Missing/invalid Access JWT        | `403` (handler), edge usually blocks first          |
| JWKS fetch/parse failure          | `503` (fail closed)                                 |
| Empty tables                      | Friendly empty state in the UI                      |
| D1 read error                     | `500` via the index.js catch-all                    |
| Corrupt `recommendations` JSON    | `headline` falls back to `""`; row still listed     |

## Testing (`node --test`, backend)

- **`csv.js`:** header + rows; quoting of fields with `"`, `,`, newline; doubling of
  embedded quotes; `null`/`undefined` → empty; empty-rows case.
- **`access.js`:** generate an RS256 keypair in-test (Web Crypto), sign a JWT, and assert
  `verifyAccessJwt` accepts a valid token and rejects expired / wrong-`aud` /
  tampered-signature tokens; `ACCESS_DEV_BYPASS` short-circuits. (JWKS fetch is injected
  or stubbed so the test is hermetic.)
- **router:** the two admin routes resolve; non-GET/typo paths don't.
- Handlers + db list helpers verified via `wrangler dev` with `ACCESS_DEV_BYPASS=true`
  (repo convention: pure functions unit-tested, D1/handlers exercised live).

## Config / ops (one-time, owner-performed)

1. Create the Cloudflare Access self-hosted app (paths `/admin*` + `/api/admin/*` on
   l8ti.com), policy allowing the owner email; copy the AUD tag.
2. Set `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD` in `wrangler.toml` `[vars]`.
3. `npm run deploy`.
4. (Local dev) add `ACCESS_DEV_BYPASS=true` to `.dev.vars` / `.dev.vars.example`.

## Dependencies / risks

- **Access app must cover both paths.** If `/api/admin/*` isn't in the app's paths, the
  edge won't gate the API — but the Worker JWT check still refuses, so it fails closed.
- **JWKS availability.** A transient JWKS fetch failure returns 503; in-memory caching
  keeps this rare after the first verified request per isolate.
- **Public `/plan/:id` reuse.** Plan detail is not behind Access (it's already a public
  shareable link). This is intentional and unchanged by this feature.
- Row caps (1000) are ample now; pagination is deferred until volume warrants it
  (`log`/note if a list hits the cap is a future nicety, not in scope).
