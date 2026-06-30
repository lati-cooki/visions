// Tests for pure db.js helpers that don't need a real D1 connection: startOfUtcDayIso
// is already covered by dates.test.js. This file covers deleteExpiredVerifications
// with a mocked DB and the listBookings/listPlans new shape.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteExpiredVerifications, listBookings, listPlans } from "../src/lib/db.js";

// ── deleteExpiredVerifications ────────────────────────────────────────────────

test("deleteExpiredVerifications calls DELETE with two cutoff params", async () => {
  let capturedSql = null;
  let capturedBindArgs = null;
  const env = {
    DB: {
      prepare: (sql) => {
        capturedSql = sql;
        return {
          bind: (...args) => {
            capturedBindArgs = args;
            return { run: async () => ({ meta: { changes: 3 } }) };
          },
        };
      },
    },
  };

  const deleted = await deleteExpiredVerifications(env);
  assert.equal(deleted, 3);
  assert.ok(capturedSql.includes("DELETE FROM email_verifications"), "should DELETE from email_verifications");
  assert.ok(capturedSql.includes("expires_at"), "should filter by expires_at");
  assert.ok(capturedSql.includes("consumed_at"), "should filter by consumed_at");
  assert.equal(capturedBindArgs?.length, 2, "should bind two cutoff timestamps");
  // Both bind params should be ISO strings
  for (const arg of capturedBindArgs) {
    assert.ok(
      typeof arg === "string" && !Number.isNaN(Date.parse(arg)),
      `bind arg should be an ISO string, got: ${arg}`
    );
  }
});

test("deleteExpiredVerifications returns 0 when no rows deleted", async () => {
  const env = {
    DB: {
      prepare: () => ({
        bind: () => ({ run: async () => ({ meta: { changes: 0 } }) }),
      }),
    },
  };
  assert.equal(await deleteExpiredVerifications(env), 0);
});

// ── listBookings / listPlans new shape ────────────────────────────────────────

test("listBookings returns { rows, total, capped } shape", async () => {
  let callCount = 0;
  const env = {
    DB: {
      prepare: () => ({
        first: async () => {
          callCount++;
          return { n: 5 };
        },
        bind: () => ({
          all: async () => ({ results: [{ id: "b1", name: "Pat" }] }),
        }),
      }),
    },
  };

  const result = await listBookings(env);
  assert.ok("rows" in result, "should have rows");
  assert.ok("total" in result, "should have total");
  assert.ok("capped" in result, "should have capped");
  assert.equal(result.total, 5);
  assert.equal(result.rows.length, 1);
  assert.equal(result.capped, true); // 1 row returned vs 5 total
});

test("listPlans returns { rows, total, capped } with headline parsed from recommendations", async () => {
  const env = {
    DB: {
      prepare: () => ({
        first: async () => ({ n: 1 }),
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "p1",
                business_type: "Cafe",
                email: "a@b.com",
                team_size: "solo",
                budget: "free",
                recommendations: JSON.stringify({ headline: "Your plan" }),
                created_at: new Date().toISOString(),
              },
            ],
          }),
        }),
      }),
    },
  };

  const result = await listPlans(env);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].headline, "Your plan");
  assert.equal(result.capped, false); // 1 returned == 1 total
});
