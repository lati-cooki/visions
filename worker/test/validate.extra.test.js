// Additional validate.js tests covering new chat rules (planId, history caps)
// and the updated painPoints cap (4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateChat, validateProfile, MAX_CHAT_HISTORY } from "../src/lib/validate.js";

// ── validateChat ──────────────────────────────────────────────────────────────

test("validateChat accepts a minimal valid body", () => {
  assert.equal(
    validateChat({ planId: "abc123", message: "What should I do first?" }),
    null
  );
});

test("validateChat accepts a body with a short history", () => {
  assert.equal(
    validateChat({
      planId: "abc123",
      message: "Follow-up?",
      history: [
        { role: "user", content: "First question" },
        { role: "assistant", content: "First answer" },
      ],
    }),
    null
  );
});

test("validateChat rejects missing planId", () => {
  assert.match(validateChat({ message: "hi" }), /planId/);
});

test("validateChat rejects empty planId", () => {
  assert.match(validateChat({ planId: "  ", message: "hi" }), /planId/);
});

test("validateChat rejects missing message", () => {
  assert.match(validateChat({ planId: "abc", message: "" }), /message/);
});

test("validateChat rejects message over 2000 chars", () => {
  assert.match(validateChat({ planId: "abc", message: "x".repeat(2001) }), /too long/);
});

test("validateChat rejects history over MAX_CHAT_HISTORY entries", () => {
  const history = Array.from({ length: MAX_CHAT_HISTORY + 1 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: "msg",
  }));
  assert.match(validateChat({ planId: "abc", message: "q", history }), /history is too long/);
});

test("validateChat rejects a history entry with content over 2000 chars", () => {
  const history = [{ role: "user", content: "x".repeat(2001) }];
  assert.match(validateChat({ planId: "abc", message: "q", history }), /history message is too long/);
});

test("validateChat rejects history that is not an array", () => {
  assert.match(validateChat({ planId: "abc", message: "q", history: "bad" }), /array/);
});

test("validateChat rejects a non-object history entry", () => {
  assert.match(validateChat({ planId: "abc", message: "q", history: ["bad"] }), /Invalid history/);
});

// ── validateProfile painPoints cap ───────────────────────────────────────────

test("validateProfile rejects more than 4 pain points", () => {
  assert.match(
    validateProfile({
      businessType: "Cafe",
      painPoints: ["a", "b", "c", "d", "e"],
    }),
    /Too many pain points/
  );
});

test("validateProfile accepts exactly 4 pain points", () => {
  assert.equal(
    validateProfile({
      businessType: "Cafe",
      painPoints: ["a", "b", "c", "d"],
    }),
    null
  );
});
