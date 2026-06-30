// Integration-style handler tests. Handlers are imported directly and called with
// minimal fake `env` / `request` objects — no Workers runtime needed for these pure
// logic paths.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chatHandler } from "../src/handlers/chat.js";
import { verifyCheckHandler } from "../src/handlers/verifyCheck.js";
import { bookingHandler } from "../src/handlers/booking.js";
import { signVerifyToken } from "../src/lib/verifyToken.js";
import { hashCode } from "../src/lib/code.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body) {
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

function makeBookingRequest(body) {
  return { json: async () => body };
}

async function parseJsonResponse(response) {
  const text = await response.text();
  return JSON.parse(text);
}

// ── chatHandler ───────────────────────────────────────────────────────────────

test("chatHandler rejects missing planId (400)", async () => {
  const req = makeRequest({ message: "hello" });
  const env = {};
  const res = await chatHandler(req, env);
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /planId/);
});

test("chatHandler rejects empty planId (400)", async () => {
  const req = makeRequest({ planId: "", message: "hello" });
  const env = {};
  const res = await chatHandler(req, env);
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /planId/);
});

test("chatHandler rejects history over MAX_CHAT_HISTORY (400)", async () => {
  const history = Array.from({ length: 21 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: "msg",
  }));
  const req = makeRequest({ planId: "abc", message: "q", history });
  const env = {};
  const res = await chatHandler(req, env);
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /history is too long/);
});

test("chatHandler returns 401 when planId does not exist in DB", async () => {
  const req = makeRequest({ planId: "nonexistent", message: "hello?" });
  const env = {
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => null, // plan not found
        }),
      }),
    },
  };
  const res = await chatHandler(req, env);
  assert.equal(res.status, 401);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /plan ID/);
});

// ── verifyCheckHandler ────────────────────────────────────────────────────────

const PEPPER = "test-pepper";
const EMAIL = "user@test.com";
const CODE = "123456";

test("verifyCheckHandler rejects wrong code (400) and uses timing-safe compare", async () => {
  const codeHash = await hashCode(PEPPER, EMAIL, CODE);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + 600_000).toISOString();

  let attemptsCalled = false;
  const env = {
    VERIFY_CODE_PEPPER: PEPPER,
    VERIFY_TOKEN_SECRET: "secret",
    DB: {
      prepare: (sql) => ({
        bind: () => ({
          first: async () =>
            sql.includes("email_verifications")
              ? {
                  id: "row1",
                  email: EMAIL,
                  code_hash: codeHash,
                  attempts: 0,
                  expires_at: expiresAt,
                  consumed_at: null,
                  created_at: nowIso,
                }
              : null,
          run: async () => {
            attemptsCalled = true;
          },
        }),
      }),
    },
  };

  const req = makeRequest({ email: EMAIL, code: "999999" });
  const res = await verifyCheckHandler(req, env);
  assert.equal(res.status, 400);
  assert.ok(attemptsCalled, "attempts should be incremented even on wrong code");
  const body = await parseJsonResponse(res);
  assert.match(body.error, /code/);
});

test("verifyCheckHandler returns 429 when attempts exhausted", async () => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + 600_000).toISOString();

  const env = {
    VERIFY_CODE_PEPPER: PEPPER,
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: "row1",
            email: EMAIL,
            code_hash: "xxx",
            attempts: 5, // at MAX_ATTEMPTS
            expires_at: expiresAt,
            consumed_at: null,
            created_at: nowIso,
          }),
          run: async () => {},
        }),
      }),
    },
  };

  const req = makeRequest({ email: EMAIL, code: "123456" });
  const res = await verifyCheckHandler(req, env);
  assert.equal(res.status, 429);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /Too many attempts/);
});

test("verifyCheckHandler returns 400 when no active code exists", async () => {
  const env = {
    VERIFY_CODE_PEPPER: PEPPER,
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => null, // no active row
          run: async () => {},
        }),
      }),
    },
  };

  const req = makeRequest({ email: EMAIL, code: "123456" });
  const res = await verifyCheckHandler(req, env);
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /expired/i);
});

// ── bookingHandler ────────────────────────────────────────────────────────────

test("bookingHandler rejects missing name (400)", async () => {
  const req = makeBookingRequest({ email: "user@test.com" });
  const res = await bookingHandler(req, {});
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /Name/);
});

test("bookingHandler rejects invalid email (400)", async () => {
  const req = makeBookingRequest({ name: "Pat", email: "notanemail" });
  const res = await bookingHandler(req, {});
  assert.equal(res.status, 400);
  const body = await parseJsonResponse(res);
  assert.match(body.error, /email/i);
});

test("bookingHandler persists and returns { ok, id } for valid booking", async () => {
  let inserted = null;
  const env = {
    DB: {
      prepare: () => ({
        bind: (...args) => ({
          run: async () => {
            inserted = args;
          },
        }),
      }),
    },
  };

  const req = makeBookingRequest({
    name: "Pat",
    email: "pat@test.com",
    message: "Looking forward to it",
  });
  const ctx = { waitUntil: () => {} };
  const res = await bookingHandler(req, env, ctx);
  assert.equal(res.status, 200);
  const body = await parseJsonResponse(res);
  assert.equal(body.ok, true);
  assert.ok(typeof body.id === "string" && body.id.length > 0);
  assert.ok(inserted !== null, "DB insert should be called");
});
