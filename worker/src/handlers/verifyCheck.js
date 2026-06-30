// worker/src/handlers/verifyCheck.js
import { json, error, readJson } from "../lib/http.js";
import { validateVerifyCheck } from "../lib/validate.js";
import { hashCode } from "../lib/code.js";
import {
  latestActiveVerification,
  incrementVerificationAttempts,
  consumeVerification,
} from "../lib/db.js";
import { signVerifyToken } from "../lib/verifyToken.js";

const MAX_ATTEMPTS = 5;

// Constant-time string comparison to prevent timing attacks on hex hash comparison.
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// POST /api/verify/check — validates a code, returns a short-lived verification token.
export async function verifyCheckHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateVerifyCheck(body);
  if (invalid) return error(invalid, 400);

  const email = body.email.trim().toLowerCase();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const row = await latestActiveVerification(env, email, nowIso);
  if (!row) return error("That code has expired. Please request a new one.", 400);
  if (row.attempts >= MAX_ATTEMPTS) {
    return error("Too many attempts. Please request a new code.", 429);
  }

  await incrementVerificationAttempts(env, row.id);
  const provided = await hashCode(env.VERIFY_CODE_PEPPER, email, body.code.trim());

  // Use constant-time comparison to prevent timing-based oracle on the hash.
  if (!timingSafeEqual(provided, row.code_hash)) {
    return error("That code isn't right. Please try again.", 400);
  }

  await consumeVerification(env, row.id, nowIso);
  const ttlMin = Number(env.VERIFY_TOKEN_TTL_MIN || 30);
  const token = await signVerifyToken(env.VERIFY_TOKEN_SECRET, email, ttlMin, nowMs);
  return json({ token });
}
