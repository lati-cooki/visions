import { json, error, readJson } from "../lib/http.js";
import { validateChat } from "../lib/validate.js";
import { buildChatRequest } from "../lib/prompts.js";
import { callMessages, extractText } from "../lib/anthropic.js";

// POST /api/chat — answer a follow-up question with profile + plan context. Returns { reply }.
export async function chatHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateChat(body);
  if (invalid) return error(invalid, 400);

  const message = await callMessages(env, buildChatRequest(body, env));
  const reply = extractText(message) || "I didn't get a response. Please try again.";
  return json({ reply });
}
