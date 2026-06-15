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
