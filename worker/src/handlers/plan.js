import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateProfile, normalizeProfile } from "../lib/validate.js";
import { buildPlanRequest, buildPlanMessage } from "../lib/prompts.js";
import { callMessages, extractText, parseJsonText } from "../lib/anthropic.js";
import { runAgent } from "../lib/agents.js";
import { verifyVerifyToken } from "../lib/verifyToken.js";
import {
  insertPlan,
  countPlansForEmailSince,
  countPlansSince,
  startOfUtcDayIso,
} from "../lib/db.js";
import { sendPlanEmail } from "../lib/email.js";
import { newId } from "../lib/ids.js";

// POST /api/plan — requires a verification token (obtained via /api/verify/check after
// Turnstile), enforces the per-email + global daily caps, generates + persists the plan,
// and emails it to the verified address.
export async function planHandler(request, env, ctx) {
  const body = await readJson(request);
  const invalid = validateProfile(body);
  if (invalid) return error(invalid, 400);

  // Email-verification gate (replaces Turnstile here; Turnstile now guards verify/start).
  const { valid, email } = await verifyVerifyToken(
    env.VERIFY_TOKEN_SECRET,
    body?.verifyToken,
    Date.now()
  );
  if (!valid) {
    throw new ApiError("Email verification required. Please verify your email and try again.", 401);
  }

  // Daily caps — the hard ceiling on token spend.
  const dayStart = startOfUtcDayIso(Date.now());
  const perEmailCap = Number(env.PER_EMAIL_DAILY_CAP || 3);
  const globalCap = Number(env.GLOBAL_DAILY_PLAN_CAP || 200);
  if ((await countPlansForEmailSince(env, email, dayStart)) >= perEmailCap) {
    throw new ApiError(
      `You've reached today's limit of ${perEmailCap} plans for this email. Try again tomorrow.`,
      429
    );
  }
  if ((await countPlansSince(env, dayStart)) >= globalCap) {
    throw new ApiError("We've hit today's capacity. Please check back tomorrow.", 429);
  }

  const profile = normalizeProfile(body);

  let rawText;
  if (env.USE_MANAGED_AGENT === "true") {
    rawText = await runAgent(env, buildPlanMessage(profile));
  } else {
    rawText = extractText(await callMessages(env, buildPlanRequest(profile, env)));
  }

  let plan;
  try {
    plan = parseJsonText(rawText);
  } catch {
    throw new ApiError("The AI returned an unreadable plan. Please try again.", 502);
  }
  if (!plan?.headline || !Array.isArray(plan.quick_wins)) {
    throw new ApiError("The AI returned an incomplete plan. Please try again.", 502);
  }

  // Re-check caps immediately before writing to narrow the TOCTOU window (concurrent
  // requests may both pass the first check above while the AI call is in flight).
  if ((await countPlansForEmailSince(env, email, dayStart)) >= perEmailCap) {
    throw new ApiError(
      `You've reached today's limit of ${perEmailCap} plans for this email. Try again tomorrow.`,
      429
    );
  }
  if ((await countPlansSince(env, dayStart)) >= globalCap) {
    throw new ApiError("We've hit today's capacity. Please check back tomorrow.", 429);
  }

  const id = newId();
  await insertPlan(env, { id, profile, recommendations: plan, email });

  // Email the plan to the verified address; a send failure must never fail the response.
  const deliver = sendPlanEmail(env, email, plan, id).catch((e) =>
    console.error("Plan email failed:", e)
  );
  if (ctx?.waitUntil) ctx.waitUntil(deliver);

  return json({ id, plan });
}
