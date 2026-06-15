// Minimal Anthropic Messages API client over raw fetch (no SDK — keeps the Worker
// zero-dependency per project standard). The API key lives in env (Worker secret), never
// in the client bundle.

import { ApiError } from "./http.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// POST a request body to /v1/messages and return the parsed message object.
export async function callMessages(env, body) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ApiError("Server is not configured (missing ANTHROPIC_API_KEY).", 500);
  }

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Anthropic fetch failed:", err);
    throw new ApiError("Could not reach the AI service.", 502);
  }

  if (!res.ok) {
    console.error("Anthropic API error:", res.status, await safeText(res));
    throw new ApiError("The AI service returned an error.", 502);
  }

  const message = await res.json();
  // Claude 4+ can decline a request with stop_reason "refusal" on a 200 — treat as an error.
  if (message?.stop_reason === "refusal") {
    throw new ApiError("The request was declined. Try rephrasing.", 422);
  }
  return message;
}

// Concatenate the text from a message's content blocks.
export function extractText(message) {
  if (!message || !Array.isArray(message.content)) return "";
  return message.content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

// Parse JSON from model text, tolerating accidental markdown code fences.
export function parseJsonText(text) {
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
