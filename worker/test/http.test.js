// Tests for the CORS helper in index.js (allowedOrigin logic extracted for testability)
// and http.js response helpers (no CORS headers on raw helpers now).
import { test } from "node:test";
import assert from "node:assert/strict";
import { json, error, preflight } from "../src/lib/http.js";

// ── Response helpers no longer set CORS headers ───────────────────────────────

test("json() does not set Access-Control-Allow-Origin", () => {
  const res = json({ ok: true });
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(res.headers.get("Content-Type"), "application/json");
});

test("error() returns JSON with an error field and no CORS header", async () => {
  const res = error("Bad input", 400);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
  const body = await res.json();
  assert.equal(body.error, "Bad input");
});

test("preflight() returns 204 with no body and no CORS header", () => {
  const res = preflight();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
});

// ── allowedOrigin logic (replicated to keep tests dependency-free) ────────────
// This mirrors the logic in worker/src/index.js::allowedOrigin() for unit testing.

function allowedOrigin(requestOrigin, siteUrl) {
  if (!siteUrl) return "*";
  const site = siteUrl.replace(/\/$/, "");
  return requestOrigin === site ? site : null;
}

test("allowedOrigin returns * when SITE_URL is not configured", () => {
  assert.equal(allowedOrigin("https://example.com", ""), "*");
  assert.equal(allowedOrigin("https://example.com", undefined), "*");
  assert.equal(allowedOrigin("", null), "*");
});

test("allowedOrigin returns the origin when it matches SITE_URL", () => {
  assert.equal(allowedOrigin("https://l8ti.com", "https://l8ti.com"), "https://l8ti.com");
});

test("allowedOrigin strips trailing slash from SITE_URL before comparing", () => {
  assert.equal(allowedOrigin("https://l8ti.com", "https://l8ti.com/"), "https://l8ti.com");
});

test("allowedOrigin returns null for a non-matching origin", () => {
  assert.equal(allowedOrigin("https://evil.com", "https://l8ti.com"), null);
});

test("allowedOrigin returns null for an empty origin when SITE_URL is set", () => {
  assert.equal(allowedOrigin("", "https://l8ti.com"), null);
});
