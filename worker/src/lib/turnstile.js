// Cloudflare Turnstile verification. Keeps the Worker zero-dependency: a pure body
// builder (unit-tested) plus a thin fetch wrapper that calls siteverify. The secret key
// lives in env (Worker secret), never in the client bundle.

import { ApiError } from "./http.js";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Pure: build the application/x-www-form-urlencoded body for the siteverify call.
export function buildSiteverifyBody(secret, token, remoteip) {
  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteip) form.set("remoteip", remoteip);
  return form;
}

// Verify a Turnstile token. Resolves true on success; throws ApiError otherwise.
export async function verifyTurnstile(env, token, remoteip) {
  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApiError("Server is not configured (missing TURNSTILE_SECRET_KEY).", 500);
  }
  if (typeof token !== "string" || !token) {
    throw new ApiError("Verification required.", 403);
  }

  let res;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: buildSiteverifyBody(env.TURNSTILE_SECRET_KEY, token, remoteip),
    });
  } catch {
    throw new ApiError("Could not verify the request.", 502);
  }

  const data = await res.json().catch(() => null);
  if (!data?.success) throw new ApiError("Verification failed. Please try again.", 403);
  return true;
}
