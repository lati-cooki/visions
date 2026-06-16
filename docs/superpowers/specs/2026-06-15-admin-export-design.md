# Admin "export all data" — design

**Date:** 2026-06-15
**Owner:** Troy Latimer / Lati Cooki LLC
**Status:** Approved (brainstorming) — pending implementation plan

## Problem

The admin page exports bookings and plans as separate CSVs, but the plans CSV is
summary-only (it omits the full generated `recommendations`). There's no single
complete-backup export of all records.

## Goal

Add an **"Export all data"** button to `/admin` that downloads one JSON file containing
every booking and every plan — including the full plan `recommendations` — as a complete
backup. Reuses the existing Cloudflare Access gate; no new ops/config.

Non-goals: scheduled/automated backups, ZIP/CSV bundling, exporting `email_verifications`
(transient verification rows, not records), pagination of the export.

## Format

A single JSON file, `Content-Disposition: attachment; filename="visions-export-YYYY-MM-DD.json"`:

```json
{
  "exported_at": "2026-06-15T18:30:00.000Z",
  "bookings": [ { "id": "...", "plan_id": "...", "name": "...", "email": "...",
                 "phone": "...", "preferred_time": "...", "message": "...",
                 "created_at": "..." } ],
  "plans":    [ { "id": "...", "business_type": "...", "pain_points": [...],
                 "team_size": "...", "budget": "...", "extra_context": "...",
                 "email": "...", "created_at": "...",
                 "recommendations": { ...full generated plan object... } } ]
}
```

JSON (not CSV/ZIP) is chosen because the plan `recommendations` is nested data that CSV
can't represent and a Worker ZIP builder would be needless complexity.

## Backend

### Endpoint

`GET /api/admin/export` — Access-gated (same `verifyAccessJwt` as the other admin
endpoints; failure → 403/503). Returns the JSON file attachment.

### New units / changes

- `worker/src/lib/db.js` — `listPlansFull(env, limit = 1000)`: selects all plan columns
  (`id, business_type, pain_points, team_size, budget, extra_context, recommendations,
  created_at, email`), newest first, parsing `pain_points` and `recommendations` JSON to
  objects (via the existing `safeParse`, falling back to `[]` / `null`). `listBookings`
  is reused unchanged.
- `worker/src/lib/export.js` — pure helpers, unit-tested:
  - `buildExport(bookings, plans, nowIso)` → `{ exported_at: nowIso, bookings, plans }`.
  - `exportFilename(nowIso)` → `visions-export-YYYY-MM-DD.json` (date portion of the ISO).
- `worker/src/lib/http.js` — `download(body, filename, contentType)` generalizing the
  existing `csv()` helper (sets `Content-Type` + `Content-Disposition: attachment` + CORS).
  `csv()` may be refactored to call `download(text, filename, "text/csv; charset=utf-8")`
  to avoid duplication.
- `worker/src/handlers/adminExport.js` — verify Access, gather `listBookings` +
  `listPlansFull`, build the object, return
  `download(JSON.stringify(payload, null, 2), exportFilename(now), "application/json")`.

### Routing / dispatch

`router.js` gains `GET /api/admin/export` → `adminExport`; `index.js` dispatches it
(handler signature `(request, env)`, like the other admin handlers).

## Frontend

- `src/lib/api.js` — no new client function needed; the export is a direct download link.
  (Optional: export an `ADMIN_EXPORT_PATH` constant for the href; otherwise hardcode the
  relative path in the page.)
- `src/pages/AdminPage.jsx` — add an **"⬇ Export all data"** button in the header next to
  the existing per-tab "Download CSV" button. It's a plain `<a href="/api/admin/export">`
  (same-origin → the Access cookie rides along; the server `Content-Disposition` names the
  file). Inert in pure-frontend mock mode (like the CSV links). The per-tab CSV buttons
  stay — quick spreadsheet pull vs. full JSON backup are distinct needs.

## Data flow

```
Browser (Access cookie) ─GET /api/admin/export─▶ Worker
  verifyAccessJwt ─ok─▶ listBookings + listPlansFull ─▶ buildExport ─▶
  download(JSON, "visions-export-YYYY-MM-DD.json", "application/json") ─▶ file
```

## Security / ops — nothing new

`/api/admin/export` matches the `/api/admin/` prefix the Cloudflare Access app already
covers, so it's edge-gated automatically. The Worker `verifyAccessJwt` also gates it
unconditionally (defense-in-depth) — so it fails closed even if the edge prefix didn't
match. No new Access application changes, no new vars, no redeploy of Access settings.

## Error handling

| Condition                    | Result                                              |
|------------------------------|-----------------------------------------------------|
| Missing/invalid Access JWT   | 403 (handler); edge usually blocks first            |
| JWKS fetch failure           | 503 (fail closed)                                   |
| D1 read error                | 500 via the index.js catch-all                      |
| Corrupt stored JSON          | `recommendations` → null / `pain_points` → [] per row; export still succeeds |
| No rows                      | Valid JSON with empty `bookings`/`plans` arrays     |

## Testing (`node --test`, backend)

- `export.js`: `buildExport` shape (wraps arrays + `exported_at`); `exportFilename`
  produces `visions-export-<YYYY-MM-DD>.json` from an ISO string.
- `router`: `GET /api/admin/export` resolves to `adminExport`; non-GET/typo does not.
- `listPlansFull` + the handler verified via `wrangler dev` with `ACCESS_DEV_BYPASS=true`
  (repo convention: pure functions unit-tested, D1/handlers exercised live).

## Dependencies / risks

- Reuses the existing Access gate — no ops dependency, deployable immediately.
- Export is unpaginated (full table, cap 1000 each like the lists). Ample at current
  scale; revisit if volumes grow.
- The JSON contains all customer PII by design — it's an owner-only backup behind Access.
