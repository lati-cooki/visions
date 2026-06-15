import { json, error, readJson, ApiError } from "../lib/http.js";
import { validateProfile, normalizeProfile } from "../lib/validate.js";
import { buildPlanRequest, buildPlanMessage } from "../lib/prompts.js";
import { callMessages, extractText, parseJsonText } from "../lib/anthropic.js";
import { runAgent } from "../lib/agents.js";
import { insertPlan } from "../lib/db.js";
import { newId } from "../lib/ids.js";

// POST /api/plan — validate the profile, generate a plan, persist it, return { id, plan }.
// Backend path is selected by USE_MANAGED_AGENT: drive the Managed Agent, or call the
// Messages API directly (with structured outputs). Either way the result is plan JSON.
export async function planHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateProfile(body);
  if (invalid) return error(invalid, 400);

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

  const id = newId();
  await insertPlan(env, { id, profile, recommendations: plan });
  return json({ id, plan });
}
