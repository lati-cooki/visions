import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPlanRequest, buildChatRequest, PLAN_SCHEMA } from "../src/lib/prompts.js";

const profile = {
  businessType: "Surf shop",
  painPoints: ["Getting more customers", "Social media"],
  teamSize: "Just me",
  budget: "Under $100/mo",
  extraContext: "I'm in Pacific Beach.",
};

test("buildPlanRequest includes profile, model, and structured-output schema", () => {
  const req = buildPlanRequest(profile, { ANTHROPIC_MODEL: "claude-sonnet-4-6" });
  assert.equal(req.model, "claude-sonnet-4-6");
  assert.equal(req.max_tokens, 4096);
  assert.equal(req.output_config.format.type, "json_schema");
  assert.equal(req.output_config.format.schema, PLAN_SCHEMA);

  const user = req.messages[0].content;
  assert.match(user, /Surf shop/);
  assert.match(user, /Getting more customers; Social media/);
  assert.match(user, /Pacific Beach/);
});

test("buildPlanRequest defaults model and honors LOCATION_NAME", () => {
  const req = buildPlanRequest(profile, { LOCATION_NAME: "Austin" });
  assert.equal(req.model, "claude-sonnet-4-6"); // default
  assert.match(req.system, /Austin/);
});

test("buildChatRequest filters history and appends the new user turn", () => {
  const req = buildChatRequest(
    {
      profile,
      headline: "Here's your plan",
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "system", content: "should be dropped" },
        { role: "user", content: 123 }, // non-string dropped
      ],
      message: "What next?",
    },
    {}
  );
  assert.deepEqual(req.messages, [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
    { role: "user", content: "What next?" },
  ]);
  assert.match(req.system, /Surf shop/);
  assert.match(req.system, /Here's your plan/);
});

test("PLAN_SCHEMA marks objects additionalProperties:false for strict structured output", () => {
  assert.equal(PLAN_SCHEMA.additionalProperties, false);
  assert.equal(PLAN_SCHEMA.properties.quick_wins.items.additionalProperties, false);
  assert.deepEqual(PLAN_SCHEMA.properties.quick_wins.items.properties.effort.enum, [
    "easy",
    "medium",
    "advanced",
  ]);
});
