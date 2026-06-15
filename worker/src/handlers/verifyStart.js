// worker/src/handlers/verifyStart.js
import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateVerifyStart } from "../lib/validate.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { generateCode, hashCode } from "../lib/code.js";
import { insertVerification, recentVerificationCount } from "../lib/db.js";
import { sendVerifyCodeEmail } from "../lib/email.js";
import { newId } from "../lib/ids.js";

// POST /api/verify/start — Turnstile-gated. Emails a 6-digit code (or echoes it in dev).
export async function verifyStartHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateVerifyStart(body);
  if (invalid) return error(invalid, 400);

  await verifyTurnstile(env, body?.turnstileToken, request.headers.get("CF-Connecting-IP"));

  const email = body.email.trim().toLowerCase();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Per-email throttle: at most one code per 60 seconds.
  const since = new Date(nowMs - 60_000).toISOString();
  if ((await recentVerificationCount(env, email, since)) > 0) {
    return error("Please wait a moment before requesting another code.", 429);
  }

  const code = generateCode();
  const ttlMin = Number(env.VERIFY_CODE_TTL_MIN || 10);
  const expiresAt = new Date(nowMs + ttlMin * 60_000).toISOString();
  const codeHash = await hashCode(env.VERIFY_CODE_PEPPER, email, code);
  await insertVerification(env, { id: newId(), email, codeHash, expiresAt, createdAt: nowIso });

  try {
    await sendVerifyCodeEmail(env, email, code);
  } catch (e) {
    console.error("Verify code email failed:", e);
    if (env.VERIFY_DEV_ECHO !== "true") {
      throw new ApiError("We couldn't send your code. Please try again.", 503);
    }
  }

  const res = { ok: true };
  if (env.VERIFY_DEV_ECHO === "true") res.devCode = code; // dev only — never set in prod
  return json(res);
}
