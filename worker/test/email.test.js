import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBookingEmail } from "../src/lib/email.js";

test("buildBookingEmail composes subject and body from a full booking", () => {
  const msg = buildBookingEmail(
    {
      name: "Pat",
      email: "pat@x.com",
      phone: "555-0100",
      preferred: "morning",
      planId: "abc",
      message: "Looking forward to it",
    },
    "owner@l8ti.com",
    { email: "bookings@l8ti.com", name: "Visions" }
  );
  assert.equal(msg.to, "owner@l8ti.com");
  assert.deepEqual(msg.from, { email: "bookings@l8ti.com", name: "Visions" });
  assert.match(msg.subject, /Pat/);
  assert.match(msg.text, /pat@x\.com/);
  assert.match(msg.text, /555-0100/);
  assert.match(msg.text, /morning/);
  assert.match(msg.text, /abc/);
  assert.match(msg.text, /Looking forward to it/);
});

test("buildBookingEmail omits empty optional fields and notes no message", () => {
  const msg = buildBookingEmail(
    { name: "Pat", email: "pat@x.com", phone: "", preferred: "", planId: null, message: "" },
    "owner@l8ti.com",
    { email: "bookings@l8ti.com", name: "Visions" }
  );
  assert.doesNotMatch(msg.text, /Phone:/);
  assert.doesNotMatch(msg.text, /Preferred:/);
  assert.doesNotMatch(msg.text, /Plan:/);
  assert.match(msg.text, /\(no message\)/);
});
