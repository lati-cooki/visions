// worker/test/export.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExport, exportFilename } from "../src/lib/export.js";

test("buildExport wraps bookings + plans with exported_at", () => {
  const out = buildExport([{ id: "b1" }], [{ id: "p1" }], "2026-06-15T18:30:00.000Z");
  assert.deepEqual(out, {
    exported_at: "2026-06-15T18:30:00.000Z",
    bookings: [{ id: "b1" }],
    plans: [{ id: "p1" }],
  });
});

test("exportFilename uses the date portion of the ISO timestamp", () => {
  assert.equal(exportFilename("2026-06-15T18:30:00.000Z"), "visions-export-2026-06-15.json");
});
