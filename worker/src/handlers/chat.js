import { json, error, readJson } from "../lib/http.js";
import { validateChat } from "../lib/validate.js";
import { buildChatRequest, buildChatMessage } from "../lib/prompts.js";
import { callMessages, extractText } from "../lib/anthropic.js";
import { runAgent } from "../lib/agents.js";

// POST /api/chat — answer a follow-up with profile + plan context. Returns { reply }.
// Selects the Managed Agent or the Messages API via USE_MANAGED_AGENT.
export async function chatHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateChat(body);
  if (invalid) return error(invalid, 400);

  let reply;
  if (env.USE_MANAGED_AGENT === "true") {
    reply = await runAgent(env, buildChatMessage(body));
  } else {
    reply = extractText(await callMessages(env, buildChatRequest(body, env)));
  }

  return json({ reply: reply || "I didn't get a response. Please try again." });
}
