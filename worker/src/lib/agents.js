// Managed Agents client (raw fetch, no SDK). Drives agent_<AGENT_ID> in environment
// <AGENT_ENV_ID> for one request: create a session, send the user message, wait for the
// agent to finish, return its text. Used when USE_MANAGED_AGENT is "true".
//
// NOTE: the Sessions API still requires Anthropic auth (ANTHROPIC_API_KEY) — the Managed
// Agent changes the call shape, not the need for a credential. Each request provisions a
// session (and container), so this is heavier and slower than a single Messages call, and
// the plan JSON is prompt-enforced rather than schema-guaranteed (sessions have no
// output_config.format). See agents/README.md for the trade-offs.

import { ApiError } from "./http.js";

const ANTHROPIC_VERSION = "2023-06-01";
const AGENTS_BETA = "managed-agents-2026-04-01";
const MAX_POLLS = 40;
const POLL_DELAY_MS = 1500;

const base = (env) => env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";

function headers(env) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ApiError("Server is not configured (missing ANTHROPIC_API_KEY).", 500);
  }
  return {
    "x-api-key": env.ANTHROPIC_API_KEY,
    "anthropic-version": ANTHROPIC_VERSION,
    "anthropic-beta": AGENTS_BETA,
    "content-type": "application/json",
  };
}

// A session is done when it goes idle with a terminal stop_reason (not waiting on us).
export function isTerminalIdle(event) {
  return (
    event?.type === "session.status_idle" &&
    event?.stop_reason?.type !== "requires_action"
  );
}

// Concatenate the text from all agent.message blocks in an events list.
export function collectAgentText(events) {
  let out = "";
  for (const ev of events || []) {
    if (ev?.type === "agent.message" && Array.isArray(ev.content)) {
      out += ev.content
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("");
    }
  }
  return out;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeText = async (res) => {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
};

// Run one agent turn and return its text reply.
export async function runAgent(env, userText) {
  if (!env.AGENT_ID || !env.AGENT_ENV_ID) {
    throw new ApiError("Server is missing AGENT_ID / AGENT_ENV_ID.", 500);
  }
  const h = headers(env);
  const root = base(env);

  const createRes = await fetch(`${root}/v1/sessions`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ agent: env.AGENT_ID, environment_id: env.AGENT_ENV_ID }),
  });
  if (!createRes.ok) {
    console.error("Agent session create failed:", createRes.status, await safeText(createRes));
    throw new ApiError("Could not start the AI agent session.", 502);
  }
  const session = await createRes.json();
  const sid = session.id;

  try {
    const sendRes = await fetch(`${root}/v1/sessions/${sid}/events`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        events: [{ type: "user.message", content: [{ type: "text", text: userText }] }],
      }),
    });
    if (!sendRes.ok) {
      console.error("Agent message send failed:", sendRes.status, await safeText(sendRes));
      throw new ApiError("The AI agent session failed.", 502);
    }

    for (let i = 0; i < MAX_POLLS; i++) {
      await delay(POLL_DELAY_MS);
      const listRes = await fetch(`${root}/v1/sessions/${sid}/events`, { headers: h });
      if (!listRes.ok) continue;

      const body = await listRes.json();
      const events = Array.isArray(body) ? body : body.data || [];

      if (events.some((e) => e?.type === "session.status_terminated")) {
        throw new ApiError("The AI agent session ended unexpectedly.", 502);
      }
      if (events.some(isTerminalIdle)) {
        const text = collectAgentText(events);
        if (!text) throw new ApiError("The AI agent returned an empty response.", 502);
        return text;
      }
    }
    throw new ApiError("The AI agent timed out. Please try again.", 504);
  } finally {
    // Best-effort cleanup of the disposable session.
    try {
      await fetch(`${root}/v1/sessions/${sid}`, { method: "DELETE", headers: h });
    } catch {
      /* ignore cleanup failures */
    }
  }
}
