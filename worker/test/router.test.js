import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRoute } from "../src/lib/router.js";

test("resolveRoute maps known routes", () => {
  assert.deepEqual(resolveRoute("GET", "/api/health"), { name: "health" });
  assert.deepEqual(resolveRoute("POST", "/api/plan"), { name: "plan" });
  assert.deepEqual(resolveRoute("POST", "/api/chat"), { name: "chat" });
  assert.deepEqual(resolveRoute("POST", "/api/booking"), { name: "booking" });
});

test("resolveRoute extracts plan id from GET /api/plan/:id", () => {
  assert.deepEqual(resolveRoute("GET", "/api/plan/abc123"), {
    name: "getPlan",
    id: "abc123",
  });
  assert.deepEqual(resolveRoute("GET", "/api/plan/a%20b"), {
    name: "getPlan",
    id: "a b",
  });
});

test("resolveRoute returns null for unknown or mismatched routes", () => {
  assert.equal(resolveRoute("GET", "/api/plan"), null); // GET on the create route
  assert.equal(resolveRoute("GET", "/api/plan/"), null); // empty id
  assert.equal(resolveRoute("DELETE", "/api/plan"), null);
  assert.equal(resolveRoute("GET", "/api/unknown"), null);
});

test("routes the verify endpoints", () => {
  assert.deepEqual(resolveRoute("POST", "/api/verify/start"), { name: "verifyStart" });
  assert.deepEqual(resolveRoute("POST", "/api/verify/check"), { name: "verifyCheck" });
  assert.equal(resolveRoute("GET", "/api/verify/start"), null);
});
