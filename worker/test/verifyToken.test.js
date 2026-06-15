// worker/test/verifyToken.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { signVerifyToken, verifyVerifyToken } from "../src/lib/verifyToken.js";

const SECRET = "test-secret";
const NOW = 1_700_000_000_000;

test("signs and verifies a token, recovering the email", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const result = await verifyVerifyToken(SECRET, token, NOW + 60_000);
  assert.deepEqual(result, { valid: true, email: "owner@biz.com" });
});

test("rejects an expired token", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const result = await verifyVerifyToken(SECRET, token, NOW + 31 * 60_000);
  assert.equal(result.valid, false);
});

test("rejects a token signed with a different secret", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  assert.equal((await verifyVerifyToken("other-secret", token, NOW)).valid, false);
});

test("rejects a tampered payload", async () => {
  const token = await signVerifyToken(SECRET, "owner@biz.com", 30, NOW);
  const [, sig] = token.split(".");
  const forged = `${Buffer.from("evil@biz.com|" + (NOW + 9e9)).toString("base64url")}.${sig}`;
  assert.equal((await verifyVerifyToken(SECRET, forged, NOW)).valid, false);
});

test("rejects malformed tokens", async () => {
  assert.equal((await verifyVerifyToken(SECRET, "", NOW)).valid, false);
  assert.equal((await verifyVerifyToken(SECRET, "no-dot", NOW)).valid, false);
  assert.equal((await verifyVerifyToken(SECRET, null, NOW)).valid, false);
});
