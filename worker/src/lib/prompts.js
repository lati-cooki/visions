// Prompt construction lives server-side (moved here from the browser prototype). Pure
// functions of (profile/input, env), so they're unit-testable and the live location/model
// stay configurable via Worker vars.

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_LOCATION = "San Diego";
const DEFAULT_FLAVOR =
  "tourism seasons, border trade, the military community, and beach/surf culture";

// JSON Schema for the plan, enforced via structured outputs (output_config.format). This
// guarantees parseable, well-shaped output and removes the prototype's fragile
// strip-fences-and-hope parsing. Array length (3-4 quick wins) isn't expressible in the
// schema, so it's requested in the prompt.
export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    quick_wins: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          tools: { type: "array", items: { type: "string" } },
          effort: { type: "string", enum: ["easy", "medium", "advanced"] },
          monthly_cost: { type: "string" },
          task: { type: "string" },
        },
        required: ["title", "description", "tools", "effort", "monthly_cost", "task"],
      },
    },
    agent_opportunity: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        impact: { type: "string" },
      },
      required: ["title", "description", "impact"],
    },
    next_step: { type: "string" },
  },
  required: ["headline", "quick_wins", "agent_opportunity", "next_step"],
};

const model = (env) => env?.ANTHROPIC_MODEL || DEFAULT_MODEL;
const location = (env) => env?.LOCATION_NAME || DEFAULT_LOCATION;
const flavor = (env) => env?.LOCATION_FLAVOR || DEFAULT_FLAVOR;

// Build the /v1/messages request body for plan generation.
export function buildPlanRequest(profile, env) {
  const loc = location(env);
  const system =
    `You are an AI business advisor specializing in helping small businesses in ${loc} ` +
    `adopt AI tools and agents. A local business owner just completed an intake assessment. ` +
    `Give them a personalized, actionable plan.\n\n` +
    `Give 3-4 quick wins ranked by impact. Recommend real, specific tools (ChatGPT, Claude, ` +
    `Zapier, HubSpot, Square, Toast, Calendly, Canva, etc.) and keep monthly costs within ` +
    `their stated budget. The "effort" field must be "easy", "medium", or "advanced". Each ` +
    `quick win must include one concrete, actionable "task" they can do to implement it. Be ` +
    `practical and ${loc}-aware — reference local context (${flavor(env)}) where it's relevant.`;

  const lines = [
    "THEIR PROFILE:",
    `- Business type: ${profile.businessType}`,
    `- Top pain points: ${profile.painPoints.join("; ")}`,
    `- Team size: ${profile.teamSize || "unspecified"}`,
    `- Monthly budget for AI tools: ${profile.budget || "unspecified"}`,
  ];
  if (profile.extraContext) lines.push(`- Additional context: ${profile.extraContext}`);

  return {
    model: model(env),
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: lines.join("\n") }],
    output_config: { format: { type: "json_schema", schema: PLAN_SCHEMA } },
  };
}

// Build the /v1/messages request body for a follow-up chat turn. Carries the profile + plan
// headline as system context so answers stay grounded without regenerating the plan.
export function buildChatRequest({ profile, headline, history, message }, env) {
  const loc = location(env);
  const p = profile || {};
  const pains = Array.isArray(p.painPoints) ? p.painPoints.join(", ") : "";
  const system =
    `You are an AI business advisor for ${loc} small businesses. You previously gave ` +
    `recommendations to a ${p.businessType || "local"} business (team: ${p.teamSize || "n/a"}, ` +
    `budget: ${p.budget || "n/a"}). Their pain points: ${pains || "n/a"}.` +
    (headline ? ` The plan headline was: "${headline}".` : "") +
    ` Answer their follow-up concisely (3-5 sentences). Be specific and actionable.`;

  const priorTurns = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  return {
    model: model(env),
    max_tokens: 2048,
    system,
    messages: [...priorTurns, { role: "user", content: message }],
  };
}
