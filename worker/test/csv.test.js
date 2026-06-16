// worker/test/csv.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../src/lib/csv.js";

const COLS = [
  { key: "name", label: "Name" },
  { key: "note", label: "Note" },
];

test("toCsv emits a header row from column labels", () => {
  assert.equal(toCsv([], COLS), "Name,Note");
});

test("toCsv emits one line per row, CRLF separated", () => {
  const csv = toCsv([{ name: "Sam", note: "hi" }, { name: "Pat", note: "yo" }], COLS);
  assert.equal(csv, "Name,Note\r\nSam,hi\r\nPat,yo");
});

test("toCsv quotes fields containing comma, quote, or newline and doubles quotes", () => {
  const csv = toCsv([{ name: 'a,b', note: 'she said "hi"\nbye' }], COLS);
  assert.equal(csv, 'Name,Note\r\n"a,b","she said ""hi""\nbye"');
});

test("toCsv renders null/undefined as empty cells", () => {
  const csv = toCsv([{ name: null, note: undefined }], COLS);
  assert.equal(csv, "Name,Note\r\n,");
});
