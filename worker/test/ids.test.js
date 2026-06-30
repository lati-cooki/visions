// Tests for the newId() function.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newId } from "../src/lib/ids.js";

test("newId() returns a 32-char hex string", () => {
  const id = newId();
  assert.match(id, /^[0-9a-f]{32}$/);
});

test("newId() generates unique values", () => {
  const ids = new Set(Array.from({ length: 50 }, () => newId()));
  assert.equal(ids.size, 50);
});
