import { json, error, readJson } from "../lib/http.js";
import { validateChat } from "../lib/validate.js";
import { buildChatRequest, buildChatMessage } from "../lib/prompts.js";
import { callMessages, extractText } from "../lib/anthropic.js";
import { runAgent } from "../lib/agents.js";
import { getPlan } from "../lib/db.js";

// POST /api/chat — answer a follow-up with profile + plan context. Returns { reply }.
//
// Requires a `planId` in the request body that references a persisted plan. This ties
// every chat session to a real plan generation event, preventing unauthenticated credit
// burn via the chat endpoint. Selects the Managed Agent or the Messages API via
// USE_MANAGED_AGENT.
export async function chatHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateChat(body);
  if (invalid) return error(invalid, 400);

  // Auth gate: planId must reference a real persisted plan.
  const planRow = await getPlan(env, body.planId);
  if (!planRow) {
    return error("A valid plan ID is required to use chat.", 401);
  }

  let reply;
  if (env.USE_MANAGED_AGENT === "true") {
    reply = await runAgent(env, buildChatMessage(body));
  } else {
    reply = extractText(await callMessages(env, buildChatRequest(body, env)));
  }

  return json({ reply: reply || "I didn't get a response. Please try again." });
}
