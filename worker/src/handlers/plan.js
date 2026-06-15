import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateProfile, normalizeProfile } from "../lib/validate.js";
import { buildPlanRequest } from "../lib/prompts.js";
import { callMessages, extractText, parseJsonText } from "../lib/anthropic.js";
import { insertPlan } from "../lib/db.js";
import { newId } from "../lib/ids.js";

// POST /api/plan — validate the profile, generate a plan via Claude, persist it, and
// return { id, plan }. The id powers shareable /plan/:id links.
export async function planHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateProfile(body);
  if (invalid) return error(invalid, 400);

  const profile = normalizeProfile(body);
  const message = await callMessages(env, buildPlanRequest(profile, env));

  let plan;
  try {
    plan = parseJsonText(extractText(message));
  } catch {
    throw new ApiError("The AI returned an unreadable plan. Please try again.", 502);
  }
  if (!plan?.headline || !Array.isArray(plan.quick_wins)) {
    throw new ApiError("The AI returned an incomplete plan. Please try again.", 502);
  }

  const id = newId();
  await insertPlan(env, { id, profile, recommendations: plan });
  return json({ id, plan });
}
