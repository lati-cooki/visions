// worker/src/lib/verifyToken.js
// Stateless verification token: base64url(`email|exp`) + "." + base64url(HMAC-SHA256).
// No DB lookup — /api/plan recomputes the HMAC and checks expiry. Web Crypto only, so it
// runs identically in the Worker runtime and in `node --test`.

const enc = new TextEncoder();

function b64urlFromBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(b64) {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

async function hmacB64(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlFromBytes(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signVerifyToken(secret, email, ttlMinutes, nowMs) {
  const exp = nowMs + ttlMinutes * 60_000;
  const payload = b64urlFromBytes(enc.encode(`${email}|${exp}`));
  const sig = await hmacB64(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyVerifyToken(secret, token, nowMs) {
  if (typeof token !== "string" || !token.includes(".")) return { valid: false };
  const [payload, sig] = token.split(".");
  const expected = await hmacB64(secret, payload);
  if (!timingSafeEqual(sig, expected)) return { valid: false };

  let decoded;
  try {
    decoded = b64urlToString(payload);
  } catch {
    return { valid: false };
  }
  const sep = decoded.lastIndexOf("|");
  if (sep === -1) return { valid: false };
  const email = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!email || !Number.isFinite(exp) || nowMs > exp) return { valid: false };
  return { valid: true, email };
}
