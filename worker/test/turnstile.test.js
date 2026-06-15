import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSiteverifyBody } from "../src/lib/turnstile.js";

test("buildSiteverifyBody includes secret, response, remoteip", () => {
  const body = buildSiteverifyBody("sek", "tok", "1.2.3.4");
  assert.equal(body.get("secret"), "sek");
  assert.equal(body.get("response"), "tok");
  assert.equal(body.get("remoteip"), "1.2.3.4");
});

test("buildSiteverifyBody omits remoteip when absent", () => {
  const body = buildSiteverifyBody("sek", "tok");
  assert.equal(body.has("remoteip"), false);
});
