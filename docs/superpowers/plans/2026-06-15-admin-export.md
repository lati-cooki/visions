# Admin "Export All Data" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Export all data" button to `/admin` that downloads one JSON file containing every booking and every plan (including full `recommendations`), behind the existing Cloudflare Access gate.

**Architecture:** A new Access-gated `GET /api/admin/export` endpoint gathers all bookings + full plan records and returns a JSON file attachment. A header button on the admin page links to it. Reuses the existing `verifyAccessJwt` gate — no new ops/config.

**Tech Stack:** Cloudflare Worker (zero-dependency ESM), D1, Vite + React, `node --test`.

**Spec:** `docs/superpowers/specs/2026-06-15-admin-export-design.md`

---

## File Structure

**New backend files**
- `worker/src/lib/export.js` — pure `buildExport` + `exportFilename` helpers.
- `worker/src/handlers/adminExport.js` — `GET /api/admin/export`.
- Test: `worker/test/export.test.js` (+ a case added to `worker/test/router.test.js`).

**Modified backend files**
- `worker/src/lib/db.js` — add `listPlansFull` (full plan records, parsed JSON).
- `worker/src/lib/http.js` — add `download()` helper; refactor `csv()` to use it.
- `worker/src/lib/router.js` — route `GET /api/admin/export`.
- `worker/src/index.js` — dispatch `adminExport`.

**Modified frontend files**
- `src/pages/AdminPage.jsx` — add the "Export all data" header button.

---

## Task 1: Export helpers

**Files:**
- Create: `worker/src/lib/export.js`
- Test: `worker/test/export.test.js`

- [ ] **Step 1: Write the failing test**

```js
// worker/test/export.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExport, exportFilename } from "../src/lib/export.js";

test("buildExport wraps bookings + plans with exported_at", () => {
  const out = buildExport([{ id: "b1" }], [{ id: "p1" }], "2026-06-15T18:30:00.000Z");
  assert.deepEqual(out, {
    exported_at: "2026-06-15T18:30:00.000Z",
    bookings: [{ id: "b1" }],
    plans: [{ id: "p1" }],
  });
});

test("exportFilename uses the date portion of the ISO timestamp", () => {
  assert.equal(exportFilename("2026-06-15T18:30:00.000Z"), "visions-export-2026-06-15.json");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/export.test.js`
Expected: FAIL — `Cannot find module '../src/lib/export.js'`.

- [ ] **Step 3: Write the implementation**

```js
// worker/src/lib/export.js
// Pure helpers for the admin "export all data" backup.

export function buildExport(bookings, plans, nowIso) {
  return { exported_at: nowIso, bookings, plans };
}

export function exportFilename(nowIso) {
  return `visions-export-${nowIso.slice(0, 10)}.json`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/export.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/export.js worker/test/export.test.js
git commit -m "Add pure export helpers (buildExport, exportFilename)"
```

---

## Task 2: Full plan list helper

**Files:**
- Modify: `worker/src/lib/db.js`

No unit test (needs live D1; repo convention). Verified live in Task 7.

- [ ] **Step 1: Append `listPlansFull` to `worker/src/lib/db.js`**

Add after the existing `listPlans` function (it reuses the `safeParse` helper at the top of the file):

```js
// Full plan records (incl. parsed recommendations + pain_points) for the data export.
export async function listPlansFull(env, limit = 1000) {
  const { results } = await env.DB.prepare(
    `SELECT id, business_type, pain_points, team_size, budget, extra_context, recommendations, created_at, email
       FROM plans ORDER BY created_at DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return (results || []).map((r) => ({
    id: r.id,
    business_type: r.business_type,
    pain_points: safeParse(r.pain_points, []),
    team_size: r.team_size,
    budget: r.budget,
    extra_context: r.extra_context,
    email: r.email,
    created_at: r.created_at,
    recommendations: safeParse(r.recommendations, null),
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/lib/db.js
git commit -m "Add listPlansFull (complete plan records for export)"
```

---

## Task 3: `download` response helper

**Files:**
- Modify: `worker/src/lib/http.js`

- [ ] **Step 1: Add `download` and refactor `csv` in `worker/src/lib/http.js`**

Replace the existing `csv` function (currently the block starting `export function csv(text, filename) {`) with:

```js
export function download(body, filename, contentType) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...CORS,
    },
  });
}

export function csv(text, filename) {
  return download(text, filename, "text/csv; charset=utf-8");
}
```

- [ ] **Step 2: Verify nothing regressed**

Run: `npm test`
Expected: PASS — all existing suites stay green (the admin CSV handlers still use `csv()`, whose behavior is unchanged).

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/http.js
git commit -m "Add download() helper; csv() now delegates to it"
```

---

## Task 4: Export handler

**Files:**
- Create: `worker/src/handlers/adminExport.js`

- [ ] **Step 1: Create `worker/src/handlers/adminExport.js`**

```js
// worker/src/handlers/adminExport.js
import { download } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listBookings, listPlansFull } from "../lib/db.js";
import { buildExport, exportFilename } from "../lib/export.js";

// GET /api/admin/export — Access-gated complete JSON backup of all bookings + plans.
export async function adminExportHandler(request, env) {
  await verifyAccessJwt(env, request);
  const [bookings, plans] = await Promise.all([listBookings(env), listPlansFull(env)]);
  const nowIso = new Date().toISOString();
  const payload = buildExport(bookings, plans, nowIso);
  return download(JSON.stringify(payload, null, 2), exportFilename(nowIso), "application/json");
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/handlers/adminExport.js
git commit -m "Add Access-gated admin export handler (complete JSON backup)"
```

---

## Task 5: Route + dispatch

**Files:**
- Modify: `worker/src/lib/router.js`
- Test: `worker/test/router.test.js`
- Modify: `worker/src/index.js`

- [ ] **Step 1: Add the failing router test**

Append to `worker/test/router.test.js`:

```js
test("routes the admin export endpoint", () => {
  assert.deepEqual(resolveRoute("GET", "/api/admin/export"), { name: "adminExport" });
  assert.equal(resolveRoute("POST", "/api/admin/export"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test worker/test/router.test.js`
Expected: FAIL — `/api/admin/export` returns `null`.

- [ ] **Step 3: Add the route to `worker/src/lib/router.js`**

Add alongside the existing admin routes (before the final `return null;`):

```js
  if (method === "GET" && pathname === "/api/admin/export") return { name: "adminExport" };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test worker/test/router.test.js`
Expected: PASS.

- [ ] **Step 5: Wire dispatch in `worker/src/index.js`**

Add the import after the existing admin handler imports:

```js
import { adminExportHandler } from "./handlers/adminExport.js";
```

Add the dispatch case alongside the other admin cases:

```js
        case "adminExport":
          return await adminExportHandler(request, env);
```

- [ ] **Step 6: Run the full suite + commit**

Run: `npm test`
Expected: PASS.

```bash
git add worker/src/lib/router.js worker/test/router.test.js worker/src/index.js
git commit -m "Route + dispatch admin export endpoint"
```

---

## Task 6: Admin page export button

**Files:**
- Modify: `src/pages/AdminPage.jsx`

- [ ] **Step 1: Add the "Export all data" button to the header**

In `src/pages/AdminPage.jsx`, replace the single CSV download anchor in the header (the block `<a href={csvHref(tab)} … >↓ Download {tab === "bookings" ? "bookings" : "plans"} CSV</a>`) with a button group containing the new export link plus the existing CSV link:

```jsx
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/export"
            className="rounded-[11px] bg-brand-ocean px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-navy"
          >
            ⬇ Export all data
          </a>
          <a
            href={csvHref(tab)}
            className="rounded-[11px] border border-brand-border bg-white px-4 py-2.5 text-[14px] font-bold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy"
          >
            ↓ Download {tab === "bookings" ? "bookings" : "plans"} CSV
          </a>
        </div>
```

(The surrounding header `<div className="mb-6 flex flex-wrap items-center justify-between gap-3">` and the `<h1>Admin</h1>` stay unchanged; the `<h1>` and this new button group are the two flex children.)

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Local visual check (mock mode)**

Run: `npm run dev`, open `http://localhost:5173/admin`. Expected: the header shows both "⬇ Export all data" and "↓ Download … CSV" buttons. (Neither downloads in pure-frontend mock — that's expected; verified live in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/AdminPage.jsx
git commit -m "Add Export all data button to the admin page"
```

---

## Task 7: End-to-end verification + docs

**Files:** Modify `CLAUDE.md`. Local verification (no new ops — the existing Access app already covers `/api/admin/*`).

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
curl -s -D - -o /tmp/export.json "localhost:8787/api/admin/export" | grep -iE "content-type|content-disposition"
head -c 200 /tmp/export.json; echo
```

Expected: `Content-Type: application/json` + `Content-Disposition: attachment; filename="visions-export-YYYY-MM-DD.json"`, and the body is `{ "exported_at": "…", "bookings": [...], "plans": [...] }` (empty arrays on a fresh DB are fine).

- [ ] **Step 2: Update `CLAUDE.md`**

Add a row to the API contract table for the new endpoint and list the new files in the project structure:

```
| `GET /api/admin/export` | — (Cloudflare Access-gated) | JSON file attachment: `{ exported_at, bookings[], plans[] (full recommendations) }` |
```

Add `export.js` to the worker `lib/` line and `adminExport.js` to the worker `handlers/` line of the project structure tree.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Docs: admin export-all-data endpoint"
```

- [ ] **Step 4 (after merge): deploy**

`npm run deploy` — no Access reconfiguration needed; `/api/admin/export` is covered by the existing `/api/admin/` Access policy and gated by the Worker JWT check regardless.

---

## Self-Review

**Spec coverage:**
- `GET /api/admin/export`, Access-gated → Tasks 4, 5. ✓
- Single JSON file attachment, `visions-export-YYYY-MM-DD.json`, `{ exported_at, bookings, plans }` → Tasks 1, 4. ✓
- Plans include full `recommendations` (+ parsed pain_points) → Task 2 (`listPlansFull`). ✓
- `download()` helper generalizing `csv()` → Task 3. ✓
- Export button on the admin page (kept alongside per-tab CSV) → Task 6. ✓
- No new ops/config; reuses Access gate → Tasks 5, 7. ✓
- Tests: export helpers + router route → Tasks 1, 5. ✓
- Error handling (403/503 from `verifyAccessJwt`, empty arrays, corrupt JSON → null/[]) → inherited from `verifyAccessJwt` + `safeParse` in Tasks 2, 4. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete.

**Type/name consistency:** `buildExport(bookings, plans, nowIso)` / `exportFilename(nowIso)` used identically in export.js, its test, and the handler. `listPlansFull(env, limit)` returns the shape the handler passes straight through. `download(body, filename, contentType)` signature matches its use in `csv()` and the handler. Route name `adminExport` matches between router.js, the router test, and the index.js dispatch + import. The handler reuses the existing `listBookings` and `verifyAccessJwt` unchanged.
