import { test } from "node:test";
import assert from "node:assert/strict";
import { extractText, parseJsonText } from "../src/lib/anthropic.js";

test("extractText concatenates text blocks and ignores others", () => {
  const message = {
    content: [
      { type: "text", text: "Hello " },
      { type: "thinking", thinking: "ignored" },
      { type: "text", text: "world" },
    ],
  };
  assert.equal(extractText(message), "Hello world");
});

test("extractText handles empty/missing content", () => {
  assert.equal(extractText(null), "");
  assert.equal(extractText({}), "");
  assert.equal(extractText({ content: [] }), "");
});

test("parseJsonText parses plain JSON", () => {
  assert.deepEqual(parseJsonText('{"a":1}'), { a: 1 });
});

test("parseJsonText tolerates markdown code fences", () => {
  const fenced = '```json\n{"headline":"hi","quick_wins":[]}\n```';
  assert.deepEqual(parseJsonText(fenced), { headline: "hi", quick_wins: [] });
});
