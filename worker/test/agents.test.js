import { test } from "node:test";
import assert from "node:assert/strict";
import { isTerminalIdle, collectAgentText } from "../src/lib/agents.js";

test("isTerminalIdle is true only for a non-blocking idle", () => {
  assert.equal(isTerminalIdle({ type: "session.status_idle", stop_reason: { type: "end_turn" } }), true);
  assert.equal(
    isTerminalIdle({ type: "session.status_idle", stop_reason: { type: "requires_action" } }),
    false
  );
  assert.equal(isTerminalIdle({ type: "session.status_running" }), false);
  assert.equal(isTerminalIdle(null), false);
});

test("collectAgentText concatenates agent.message text blocks", () => {
  const events = [
    { type: "user.message", content: [{ type: "text", text: "hi" }] },
    { type: "agent.message", content: [{ type: "text", text: "Here is " }, { type: "thinking", thinking: "x" }] },
    { type: "agent.message", content: [{ type: "text", text: "your plan." }] },
    { type: "session.status_idle", stop_reason: { type: "end_turn" } },
  ];
  assert.equal(collectAgentText(events), "Here is your plan.");
});

test("collectAgentText handles empty/missing input", () => {
  assert.equal(collectAgentText([]), "");
  assert.equal(collectAgentText(null), "");
  assert.equal(collectAgentText([{ type: "agent.message" }]), "");
});
