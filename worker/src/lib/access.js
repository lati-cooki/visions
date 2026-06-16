// worker/src/lib/access.js
// Verifies the Cloudflare Access JWT (Cf-Access-Jwt-Assertion) as defense-in-depth behind
// the edge Access policy. Zero-dependency: JWKS fetch (cached) + RS256 verify via Web Crypto.

import { ApiError } from "./http.js";

const enc = new TextEncoder();

function b64urlToBytes(b64url) {
  const bin = atob(b64url.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToJson(b64url) {
  return JSON.parse(atob(b64url.replace(/-/g, "+").replace(/_/g, "/")));
}

// Pure: split + decode a JWT into its parts. Throws ApiError(403) on structural problems.
export function parseJwt(token) {
  if (typeof token !== "string") throw new ApiError("Access required.", 403);
  const parts = token.split(".");
  if (parts.length !== 3) throw new ApiError("Access denied.", 403);
  let header, payload, signature;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
    signature = b64urlToBytes(parts[2]);
  } catch {
    throw new ApiError("Access denied.", 403);
  }
  return { header, payload, signingInput: `${parts[0]}.${parts[1]}`, signature };
}

// Pure: validate the audience + expiry. nowMs is injectable for tests.
export function claimsValid(payload, aud, nowMs) {
  const auds = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
  if (!aud || !auds.includes(aud)) return false;
  if (typeof payload?.exp !== "number" || payload.exp * 1000 <= nowMs) return false;
  return true;
}

let jwksCache = null; // { url, keys } — per-isolate cache

async function getJwks(url, fetchImpl, forceRefresh) {
  if (!forceRefresh && jwksCache && jwksCache.url === url) return jwksCache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw new ApiError("Could not verify access. Please try again.", 503);
  const data = await res.json();
  jwksCache = { url, keys: data.keys || [] };
  return jwksCache.keys;
}

// Verify the Access JWT on the request. Resolves the token claims, or throws ApiError
// (403 invalid/missing, 503 JWKS unavailable). ACCESS_DEV_BYPASS short-circuits for local dev.
export async function verifyAccessJwt(env, request, deps = {}) {
  if (env.ACCESS_DEV_BYPASS === "true") return { bypass: true };

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new ApiError("Access required.", 403);

  const { header, payload, signingInput, signature } = parseJwt(token);
  if (header.alg !== "RS256") throw new ApiError("Access denied.", 403);
  if (!claimsValid(payload, env.ACCESS_AUD, Date.now())) throw new ApiError("Access denied.", 403);

  const url = `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const fetchImpl = deps.fetchJwks || fetch;

  let keys = await getJwks(url, fetchImpl, false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getJwks(url, fetchImpl, true); // keys may have rotated — refetch once
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new ApiError("Access denied.", 403);

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, enc.encode(signingInput));
  if (!ok) throw new ApiError("Access denied.", 403);
  return payload;
}
