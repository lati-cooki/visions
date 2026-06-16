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
