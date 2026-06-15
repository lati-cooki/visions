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
