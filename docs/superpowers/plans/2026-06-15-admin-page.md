# Admin Page (Bookings + Plans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only `/admin` page with Bookings + Plans tables (newest first, CSV export each, plan rows link to `/plan/:id`), protected by Cloudflare Access at the edge and a Worker-side Access-JWT check as defense-in-depth.

**Architecture:** New `/api/admin/*` Worker endpoints that verify the `Cf-Access-Jwt-Assertion` JWT (RS256 via Web Crypto, JWKS cached), list from D1, and return JSON or CSV. A new SPA route `/admin` renders the two tables and CSV-download anchors. Cloudflare Access (one-time dashboard setup) is the real gate; the Worker JWT check fails closed if the edge is ever misconfigured.

**Tech Stack:** Cloudflare Worker (zero-dependency ESM), D1, Web Crypto (RS256 verify), Vite + React + react-router, `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-15-admin-page-design.md`

---

## File Structure

**New backend files**
- `worker/src/lib/csv.js` — pure `toCsv(rows, columns)` RFC-4180 serializer.
- `worker/src/lib/access.js` — `parseJwt`, `claimsValid`, `verifyAccessJwt` (Access JWT verification).
- `worker/src/handlers/adminBookings.js` — `GET /api/admin/bookings` (JSON or `?format=csv`).
- `worker/src/handlers/adminPlans.js` — `GET /api/admin/plans` (JSON or `?format=csv`).
- Tests: `worker/test/csv.test.js`, `worker/test/access.test.js` (+ a case added to `worker/test/router.test.js`).

**Modified backend files**
- `worker/src/lib/http.js` — add a `csv(text, filename)` response helper.
- `worker/src/lib/db.js` — add `listBookings`, `listPlans`.
- `worker/src/lib/router.js` — route the two admin endpoints.
- `worker/src/index.js` — dispatch the two admin handlers.
- `wrangler.toml` — `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD` vars.
- `.dev.vars.example` — `ACCESS_DEV_BYPASS=true`.

**New frontend files**
- `src/pages/AdminPage.jsx` — the admin UI (tabs + tables + CSV buttons).

**Modified frontend files**
- `src/lib/api.js` — `getAdminBookings`, `getAdminPlans`.
- `src/lib/mockData.js` — `mockAdminBookings`, `mockAdminPlans`.
- `src/App.jsx` — add the `/admin` route.

---

## Task 1: CSV serializer

**Files:**
- Create: `worker/src/lib/csv.js`
- Test: `worker/test/csv.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/csv.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/lib/csv.js";

const COLS = [
  { key: "name", label: "Name" },
  { key: "note", label: "Note" },
];

test("toCsv emits a header row from column labels", () => {
  assert.equal(toCsv([], COLS), "Name,Note");
});

test("toCsv emits one line per row, CRLF separated", () => {
  const csv = toCsv([{ name: "Sam", note: "hi" }, { name: "Pat", note: "yo" }], COLS);
  assert.equal(csv, "Name,Note\r\nSam,hi\r\nPat,yo");
});

test("toCsv quotes fields containing comma, quote, or newline and doubles quotes", () => {
  const csv = toCsv([{ name: 'a,b', note: 'she said "hi"\nbye' }], COLS);
  assert.equal(csv, 'Name,Note\r\n"a,b","she said ""hi""\nbye"');
});

test("toCsv renders null/undefined as empty cells", () => {
  const csv = toCsv([{ name: null, note: undefined }], COLS);
  assert.equal(csv, "Name,Note\r\n,");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/csv.test.js`
Expected: FAIL — `Cannot find module '../src/lib/csv.js'`.

- [ ] **Step 3: Write the implementation**

```js
// worker/src/lib/csv.js
// Pure RFC-4180 CSV serializer. `columns` is [{ key, label }]; the header row uses labels,
// each data row pulls row[key]. Fields containing " , CR or LF are quoted with embedded
// quotes doubled; null/undefined become empty cells.

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/csv.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/csv.js worker/test/csv.test.js
git commit -m "Add pure CSV serializer"
```

---

## Task 2: Cloudflare Access JWT verification

**Files:**
- Create: `worker/src/lib/access.js`
- Test: `worker/test/access.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/access.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJwt, claimsValid, verifyAccessJwt } from "../src/lib/access.js";

const enc = new TextEncoder();
const b64urlFromBytes = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlFromString = (str) => b64urlFromBytes(enc.encode(str));

// One keypair + JWKS for the whole suite.
const { publicKey, privateKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"]
);
const jwk = await crypto.subtle.exportKey("jwk", publicKey);
jwk.kid = "test-kid";
jwk.alg = "RS256";
const fetchJwks = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });

async function signJwt(payload, kid = "test-kid", signer = privateKey) {
  const header = b64urlFromString(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const body = b64urlFromString(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", signer, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

const ENV = { ACCESS_AUD: "test-aud", ACCESS_TEAM_DOMAIN: "team.example.com" };
const reqWith = (token) => new Request("https://l8ti.com/api/admin/plans", { headers: token ? { "Cf-Access-Jwt-Assertion": token } : {} });
const future = () => Math.floor(Date.now() / 1000) + 3600;

test("claimsValid checks aud membership and expiry", () => {
  assert.equal(claimsValid({ aud: ["test-aud"], exp: future() }, "test-aud", Date.now()), true);
  assert.equal(claimsValid({ aud: "test-aud", exp: future() }, "test-aud", Date.now()), true);
  assert.equal(claimsValid({ aud: ["other"], exp: future() }, "test-aud", Date.now()), false);
  assert.equal(claimsValid({ aud: ["test-aud"], exp: 1 }, "test-aud", Date.now()), false);
});

test("parseJwt rejects structurally invalid tokens", () => {
  assert.throws(() => parseJwt("not-a-jwt"), /Access/);
  assert.throws(() => parseJwt(null), /Access/);
});

test("verifyAccessJwt accepts a valid token", async () => {
  const token = await signJwt({ aud: ["test-aud"], exp: future(), email: "troy@l8ti.com" });
  const claims = await verifyAccessJwt(ENV, reqWith(token), { fetchJwks });
  assert.equal(claims.email, "troy@l8ti.com");
});

test("verifyAccessJwt rejects expired / wrong-aud / tampered / missing", async () => {
  const expired = await signJwt({ aud: ["test-aud"], exp: 1 });
  await assert.rejects(verifyAccessJwt(ENV, reqWith(expired), { fetchJwks }), /Access/);

  const wrongAud = await signJwt({ aud: ["nope"], exp: future() });
  await assert.rejects(verifyAccessJwt(ENV, reqWith(wrongAud), { fetchJwks }), /Access/);

  const valid = await signJwt({ aud: ["test-aud"], exp: future() });
  const tampered = valid.slice(0, -3) + (valid.slice(-3) === "aaa" ? "bbb" : "aaa");
  await assert.rejects(verifyAccessJwt(ENV, reqWith(tampered), { fetchJwks }), /Access/);

  await assert.rejects(verifyAccessJwt(ENV, reqWith(null), { fetchJwks }), /Access required/);
});

test("verifyAccessJwt is skipped when ACCESS_DEV_BYPASS=true", async () => {
  const out = await verifyAccessJwt({ ...ENV, ACCESS_DEV_BYPASS: "true" }, reqWith(null), { fetchJwks });
  assert.deepEqual(out, { bypass: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/access.test.js`
Expected: FAIL — `Cannot find module '../src/lib/access.js'`.

- [ ] **Step 3: Write the implementation**

```js
// worker/src/lib/access.js
// Verifies the Cloudflare Access JWT (Cf-Access-Jwt-Assertion) as defense-in-depth behind
// the edge Access policy. Zero-dependency: JWKS fetch (cached) + RS256 verify via Web Crypto.

import { ApiError } from "./http.js";

const enc = new TextEncoder();

function b64urlToBytes(b64url) {
  const bin = atob(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToJson(b64url) {
  return JSON.parse(atob(b64url.replace(/-/g, "+").replace(/_/g, "/")));
}

// Pure: split + decode a JWT into its parts. Throws ApiError(403) on structural problems.
export function parseJwt(token) {
  if (typeof token !== "string") throw new ApiError("Access required.", 403);
  const parts = token.split(".");
  if (parts.length !== 3) throw new ApiError("Access denied.", 403);
  let header, payload;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    throw new ApiError("Access denied.", 403);
  }
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature: b64urlToBytes(parts[2]) };
}

// Pure: validate the audience + expiry. nowMs is injectable for tests.
export function claimsValid(payload, aud, nowMs) {
  const auds = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!aud || !auds.includes(aud)) return false;
  if (typeof payload?.exp !== "number" || payload.exp * 1000 <= nowMs) return false;
  return true;
}

let jwksCache = null; // { url, keys } — per-isolate cache

async function getJwks(url, fetchImpl, forceRefresh) {
  if (!forceRefresh && jwksCache && jwksCache.url === url) return jwksCache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw new ApiError("Could not verify access. Please try again.", 503);
  const data = await res.json();
  jwksCache = { url, keys: data.keys || [] };
  return jwksCache.keys;
}

// Verify the Access JWT on the request. Resolves the token claims, or throws ApiError
// (403 invalid/missing, 503 JWKS unavailable). ACCESS_DEV_BYPASS short-circuits for local dev.
export async function verifyAccessJwt(env, request, deps = {}) {
  if (env.ACCESS_DEV_BYPASS === "true") return { bypass: true };

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new ApiError("Access required.", 403);

  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "RS256") throw new ApiError("Access denied.", 403);
  if (!claimsValid(payload, env.ACCESS_AUD, Date.now())) throw new ApiError("Access denied.", 403);

  const url = `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const fetchImpl = deps.fetchJwks || fetch;

  let keys = await getJwks(url, fetchImpl, false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getJwks(url, fetchImpl, true); // keys may have rotated — refetch once
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new ApiError("Access denied.", 403);

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, enc.encode(signingInput));
  if (!ok) throw new ApiError("Access denied.", 403);
  return payload;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/access.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/access.js worker/test/access.test.js
git commit -m "Add Cloudflare Access JWT verification"
```

---

## Task 3: D1 list helpers

**Files:**
- Modify: `worker/src/lib/db.js`

No unit test (needs live D1; repo convention is pure-function tests only). Verified live in Task 9.

- [ ] **Step 1: Append the list helpers to `worker/src/lib/db.js`**

Add at the end of the file (the `safeParse` helper at the top is reused by `listPlans`):

```js
// ── Admin list helpers ──
export async function listBookings(env, limit = 1000) {
  const { results } = await env.DB.prepare(
    `SELECT id, plan_id, name, email, phone, preferred_time, message, created_at
       FROM bookings ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return results || [];
}

export async function listPlans(env, limit = 1000) {
  const { results } = await env.DB.prepare(
    `SELECT id, business_type, email, team_size, budget, recommendations, created_at
       FROM plans ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return (results || []).map((r) => ({
    id: r.id,
    business_type: r.business_type,
    email: r.email,
    team_size: r.team_size,
    budget: r.budget,
    created_at: r.created_at,
    headline: safeParse(r.recommendations, {})?.headline || "",
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/lib/db.js
git commit -m "Add D1 list helpers for admin bookings + plans"
```

---

## Task 4: CSV response helper + admin handlers

**Files:**
- Modify: `worker/src/lib/http.js`
- Create: `worker/src/handlers/adminBookings.js`
- Create: `worker/src/handlers/adminPlans.js`

- [ ] **Step 1: Add a `csv` response helper to `worker/src/lib/http.js`**

Add after the existing `json` function (it reuses the module-level `CORS` constant):

```js
export function csv(text, filename) {
  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...CORS,
    },
  });
}
```

- [ ] **Step 2: Create `worker/src/handlers/adminBookings.js`**

```js
// worker/src/handlers/adminBookings.js
import { json, csv } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listBookings } from "../lib/db.js";
import { toCsv } from "../lib/csv.js";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "preferred_time", label: "Preferred time" },
  { key: "message", label: "Message" },
  { key: "plan_id", label: "Plan ID" },
  { key: "created_at", label: "Created" },
];

// GET /api/admin/bookings[?format=csv] — Access-gated lead list.
export async function adminBookingsHandler(request, env) {
  await verifyAccessJwt(env, request);
  const rows = await listBookings(env);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return csv(toCsv(rows, COLUMNS), "bookings.csv");
  }
  return json({ bookings: rows });
}
```

- [ ] **Step 3: Create `worker/src/handlers/adminPlans.js`**

```js
// worker/src/handlers/adminPlans.js
import { json, csv } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listPlans } from "../lib/db.js";
import { toCsv } from "../lib/csv.js";

const COLUMNS = [
  { key: "business_type", label: "Business" },
  { key: "email", label: "Email" },
  { key: "team_size", label: "Team size" },
  { key: "budget", label: "Budget" },
  { key: "headline", label: "Headline" },
  { key: "id", label: "Plan ID" },
  { key: "created_at", label: "Created" },
];

// GET /api/admin/plans[?format=csv] — Access-gated plan list (summary fields).
export async function adminPlansHandler(request, env) {
  await verifyAccessJwt(env, request);
  const rows = await listPlans(env);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return csv(toCsv(rows, COLUMNS), "plans.csv");
  }
  return json({ plans: rows });
}
```

- [ ] **Step 4: Run the full backend suite (nothing should regress)**

Run: `npm test`
Expected: PASS — all existing suites plus `csv` and `access`.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/http.js worker/src/handlers/adminBookings.js worker/src/handlers/adminPlans.js
git commit -m "Add Access-gated admin bookings + plans handlers (JSON/CSV)"
```

---

## Task 5: Route + dispatch the admin endpoints

**Files:**
- Modify: `worker/src/lib/router.js`
- Test: `worker/test/router.test.js`
- Modify: `worker/src/index.js`

- [ ] **Step 1: Add the failing router test**

Append to `worker/test/router.test.js`:

```js
test("routes the admin endpoints", () => {
  assert.deepEqual(resolveRoute("GET", "/api/admin/bookings"), { name: "adminBookings" });
  assert.deepEqual(resolveRoute("GET", "/api/admin/plans"), { name: "adminPlans" });
  assert.equal(resolveRoute("POST", "/api/admin/bookings"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/router.test.js`
Expected: FAIL — admin routes return `null`.

- [ ] **Step 3: Add routes to `worker/src/lib/router.js`**

Add before the final `return null;`:

```js
  if (method === "GET" && pathname === "/api/admin/bookings") return { name: "adminBookings" };
  if (method === "GET" && pathname === "/api/admin/plans") return { name: "adminPlans" };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/router.test.js`
Expected: PASS.

- [ ] **Step 5: Wire dispatch in `worker/src/index.js`**

Add the imports after the existing handler imports:

```js
import { adminBookingsHandler } from "./handlers/adminBookings.js";
import { adminPlansHandler } from "./handlers/adminPlans.js";
```

Add these cases to the dispatch switch (alongside the other `case` entries):

```js
        case "adminBookings":
          return await adminBookingsHandler(request, env);
        case "adminPlans":
          return await adminPlansHandler(request, env);
```

- [ ] **Step 6: Run the full suite + commit**

Run: `npm test`
Expected: PASS.

```bash
git add worker/src/lib/router.js worker/test/router.test.js worker/src/index.js
git commit -m "Route + dispatch admin endpoints"
```

---

## Task 6: Worker config

**Files:**
- Modify: `wrangler.toml`
- Modify: `.dev.vars.example`

- [ ] **Step 1: Add Access vars to the `[vars]` block in `wrangler.toml`**

Add after the existing verify-gate vars:

```toml
# Admin page (Cloudflare Access). Fill these from the Access self-hosted app you create
# (Zero Trust → Access → Applications) covering /admin* + /api/admin/*. No secrets — Access
# uses public-key JWTs. Empty = the admin API fails closed (403) until configured.
ACCESS_TEAM_DOMAIN = ""   # e.g. "laticooki.cloudflareaccess.com"
ACCESS_AUD = ""           # the Application Audience (AUD) tag from the Access app
```

- [ ] **Step 2: Add the dev bypass to `.dev.vars.example`**

Append:

```
# Admin page — skip Access JWT verification for local `wrangler dev` (DEV ONLY).
ACCESS_DEV_BYPASS=true
```

- [ ] **Step 3: Verify the config parses**

Run: `npx wrangler deploy --dry-run`
Expected: config parses; the new vars appear in the binding summary; the Worker bundles.

- [ ] **Step 4: Commit**

```bash
git add wrangler.toml .dev.vars.example
git commit -m "Config: Access team domain + AUD vars; dev bypass"
```

---

## Task 7: Frontend API client + mock data

**Files:**
- Modify: `src/lib/mockData.js`
- Modify: `src/lib/api.js`

- [ ] **Step 1: Add mock admin data to `src/lib/mockData.js`**

Append:

```js
// Stand-ins for the Access-gated admin lists in mock mode (so `npm run dev` renders /admin).
export function mockAdminBookings() {
  const now = new Date().toISOString();
  return [
    {
      id: "bk_demo1",
      plan_id: "pl_demo1",
      name: "Maria Lopez",
      email: "maria@harborcafe.com",
      phone: "619-555-0142",
      preferred_time: "Weekday mornings",
      message: "Want help setting up online ordering before summer.",
      created_at: now,
    },
    {
      id: "bk_demo2",
      plan_id: null,
      name: "Devon Park",
      email: "devon@parkstudio.com",
      phone: "",
      preferred_time: "Afternoons",
      message: "",
      created_at: now,
    },
  ];
}

export function mockAdminPlans() {
  const now = new Date().toISOString();
  return [
    {
      id: "pl_demo1",
      business_type: "Cafe / Coffee shop",
      email: "maria@harborcafe.com",
      team_size: "2–5 people",
      budget: "Under $100/mo",
      created_at: now,
      headline: "A focused AI starter plan for your cafe — quick wins first.",
    },
  ];
}
```

- [ ] **Step 2: Add the admin client functions to `src/lib/api.js`**

Append (these reuse the module's existing `USE_MOCK`, `API_BASE`, `delay`, and the `mockData` import — add `mockAdminBookings, mockAdminPlans` to that import):

```js
// Admin lists (Access-gated server-side). Mock mode returns sample rows so /admin renders
// without a backend or Cloudflare Access.
export async function getAdminBookings() {
  if (USE_MOCK) {
    await delay(300);
    return { bookings: mockAdminBookings() };
  }
  const res = await fetch(`${API_BASE}/api/admin/bookings`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

export async function getAdminPlans() {
  if (USE_MOCK) {
    await delay(300);
    return { plans: mockAdminPlans() };
  }
  const res = await fetch(`${API_BASE}/api/admin/plans`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}
```

Update the existing import line at the top of `src/lib/api.js`:

```js
import {
  mockPlan,
  mockSavedPlan,
  mockChatReply,
  mockAdminBookings,
  mockAdminPlans,
} from "./mockData.js";
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mockData.js src/lib/api.js
git commit -m "Frontend API: admin bookings + plans (with mock data)"
```

---

## Task 8: Admin page + route

**Files:**
- Create: `src/pages/AdminPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/pages/AdminPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Layout.jsx";
import { getAdminBookings, getAdminPlans } from "../lib/api.js";

const TABS = [
  { id: "bookings", label: "Bookings" },
  { id: "plans", label: "Plans" },
];

const fmtDate = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s || "" : d.toLocaleString();
};

// CSV downloads are plain links to the Access-gated API (same-origin in prod; the Access
// cookie rides along). Inert in pure-frontend mock mode.
const csvHref = (path) => `/api/admin/${path}?format=csv`;

const th = "px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-brand-slate";
const td = "px-3 py-2.5 align-top text-[14px] text-brand-navy";

export function AdminPage() {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState(null);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [b, p] = await Promise.all([getAdminBookings(), getAdminPlans()]);
        if (active) {
          setBookings(b.bookings || []);
          setPlans(p.plans || []);
        }
      } catch {
        if (active) setError("Couldn't load admin data. Make sure you're signed in.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rows = tab === "bookings" ? bookings : plans;

  return (
    <PageShell width="wide">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Admin</h1>
        <a
          href={csvHref(tab)}
          className="rounded-[11px] border border-brand-border bg-white px-4 py-2.5 text-[14px] font-bold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy"
        >
          ↓ Download {tab === "bookings" ? "bookings" : "plans"} CSV
        </a>
      </div>

      <div className="mb-5 flex gap-1 border-b border-brand-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-[2.5px] px-[18px] py-3 text-[15px] font-semibold transition ${
              tab === t.id
                ? "border-brand-ocean text-brand-navy"
                : "border-transparent text-brand-slate hover:text-brand-navy"
            }`}
          >
            {t.label}
            {t.id === "bookings" && bookings ? ` (${bookings.length})` : ""}
            {t.id === "plans" && plans ? ` (${plans.length})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="text-[15px] font-semibold text-brand-coral">{error}</p>}
      {!error && rows === null && <p className="text-[15px] text-brand-slate">Loading…</p>}
      {!error && rows && rows.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-brand-border bg-white px-5 py-12 text-center text-[#9aa7b1]">
          Nothing here yet.
        </div>
      )}

      {!error && rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-[12px] border border-brand-border bg-white">
          <table className="w-full border-collapse">
            {tab === "bookings" ? (
              <>
                <thead className="border-b border-brand-border bg-[#faf7f2]">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Phone</th>
                    <th className={th}>Preferred</th>
                    <th className={th}>Message</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-brand-border last:border-0">
                      <td className={`${td} font-semibold`}>{b.name}</td>
                      <td className={td}>{b.email}</td>
                      <td className={td}>{b.phone}</td>
                      <td className={td}>{b.preferred_time}</td>
                      <td className={`${td} max-w-[320px]`}>{b.message}</td>
                      <td className={td}>
                        {b.plan_id ? (
                          <Link to={`/plan/${b.plan_id}`} className="font-semibold text-brand-ocean underline">
                            view
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead className="border-b border-brand-border bg-[#faf7f2]">
                  <tr>
                    <th className={th}>Business</th>
                    <th className={th}>Email</th>
                    <th className={th}>Team</th>
                    <th className={th}>Budget</th>
                    <th className={th}>Headline</th>
                    <th className={th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b border-brand-border last:border-0">
                      <td className={`${td} font-semibold`}>{p.business_type}</td>
                      <td className={td}>{p.email}</td>
                      <td className={td}>{p.team_size}</td>
                      <td className={td}>{p.budget}</td>
                      <td className={`${td} max-w-[360px]`}>
                        <Link to={`/plan/${p.id}`} className="font-semibold text-brand-ocean underline">
                          {p.headline || "view plan"}
                        </Link>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </PageShell>
  );
}
```

- [ ] **Step 2: Add the route in `src/App.jsx`**

Add the import and the route (before the catch-all `*` route):

```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { AdvisorFlow } from "./pages/AdvisorFlow.jsx";
import { SharedPlan } from "./pages/SharedPlan.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdvisorFlow />} />
      <Route path="/plan/:id" element={<SharedPlan />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Local visual check (mock mode)**

Run: `npm run dev`, open `http://localhost:5173/admin`. Expected: Bookings tab shows 2 sample rows, Plans tab shows 1; tab counts render; the CSV link is present. (CSV won't download in pure-frontend mock — that's expected.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.jsx src/App.jsx
git commit -m "Add /admin page (bookings + plans tables, CSV links)"
```

---

## Task 9: End-to-end verification + ops handoff

**Files:** none (local verification + owner-performed ops). Do not commit secrets.

- [ ] **Step 1: Full-stack local test with the dev bypass**

```bash
cp .dev.vars.example .dev.vars   # ensure ACCESS_DEV_BYPASS=true is present
npm run db:schema:local
npm run db:migrate:local
npm run build
npm run worker:dev
```

Then against `http://localhost:8787`:

```bash
# JSON list (dev bypass active → no Access needed locally)
curl -s localhost:8787/api/admin/bookings | head -c 200; echo
curl -s localhost:8787/api/admin/plans | head -c 200; echo
# CSV download shape
curl -s -D - -o /dev/null "localhost:8787/api/admin/bookings?format=csv" | grep -i "content-disposition"
```

Expected: `{ "bookings": [...] }` / `{ "plans": [...] }` (empty arrays on a fresh DB are fine), and a `Content-Disposition: attachment; filename="bookings.csv"` header on the CSV call.

- [ ] **Step 2 (owner): Create the Cloudflare Access application**

In the Cloudflare dashboard → Zero Trust → Access → Applications → Add a **self-hosted** application:
- Application domain/paths covering `l8ti.com/admin` (and subpaths) and `l8ti.com/api/admin/`.
- Add a policy: Action **Allow**, Include → **Emails** → your email.
- Save, then open the application's **Overview** and copy the **Application Audience (AUD) Tag**.
- Note your team domain (Zero Trust → Settings → Custom Pages, or the `*.cloudflareaccess.com` subdomain).

- [ ] **Step 3 (owner): Set the Worker vars + deploy**

Edit `wrangler.toml` `[vars]`: set `ACCESS_TEAM_DOMAIN` (e.g. `laticooki.cloudflareaccess.com`) and `ACCESS_AUD` (the AUD tag). Commit, then:

```bash
npm run deploy
```

- [ ] **Step 4 (owner): Verify in production**

- Visit `https://l8ti.com/admin` → you should be redirected through the Access login, then see the page.
- Confirm `curl -s https://l8ti.com/api/admin/bookings` (no Access cookie) returns **403** (gate active).

- [ ] **Step 5: Update CLAUDE.md**

Add the `/admin` route + the two `GET /api/admin/*` endpoints to the API contract table, note the Cloudflare Access dependency under Phase 1/2, and add `AdminPage.jsx`, `access.js`, `csv.js`, and the admin handlers to the project structure. Commit:

```bash
git add CLAUDE.md
git commit -m "Docs: admin page + Access-gated admin endpoints"
```

---

## Self-Review

**Spec coverage:**
- Cloudflare Access + Worker JWT verification (JWKS, RS256, aud/exp, fail-closed, dev bypass) → Task 2, 6, 9. ✓
- `GET /api/admin/bookings` + `/api/admin/plans`, JSON + `?format=csv` → Tasks 4, 5. ✓
- `csv.js` pure serializer (RFC-4180 quoting) → Task 1. ✓
- `listBookings`/`listPlans` (newest first, plans summary + headline parse) → Task 3. ✓
- `/admin` route, two tabs, tables, CSV buttons, plan rows link to `/plan/:id` → Task 8. ✓
- Mock mode renders /admin without backend/Access → Tasks 7, 8. ✓
- Config vars + dev bypass → Task 6. ✓
- Tests for csv + access (incl. generated-keypair RS256 round-trip), router → Tasks 1, 2, 5. ✓
- Ops (Access app, vars, deploy) + prod verification → Task 9. ✓
- Plan detail reuses public `/plan/:id` (no bespoke view) → Task 8 (Link), no extra task needed. ✓
- Error handling 403/503/empty-state → Tasks 2, 8. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. The empty `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD` values in Task 6 are intentional (filled by the owner in Task 9), documented as fail-closed.

**Type/name consistency:** `toCsv(rows, columns)` with `{ key, label }` columns used identically in csv.js, both handlers, and the test. `verifyAccessJwt(env, request, deps)` / `parseJwt` / `claimsValid` names match between access.js, its test, and the handlers. `listBookings`/`listPlans` return shapes match the handler COLUMNS keys (`preferred_time`, `plan_id`, `business_type`, `team_size`, `headline`, etc.) and the AdminPage table fields. `getAdminBookings`/`getAdminPlans` return `{ bookings }`/`{ plans }`, consumed consistently in AdminPage. `csv(text, filename)` helper name matches between http.js and both handlers.
