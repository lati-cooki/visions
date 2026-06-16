import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildBookingEmail,
  buildBookingConfirmationEmail,
  buildVerifyCodeEmail,
  buildPlanEmail,
} from "../src/lib/email.js";

const FROM = { email: "plans@l8ti.com", name: "Visions" };

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

test("buildBookingConfirmationEmail thanks the customer and links the plan", () => {
  const booking = {
    name: "Sam",
    email: "sam@biz.com",
    preferred: "Weekday mornings",
    message: "Mostly weekends are busy",
    planId: "abc123",
  };
  const msg = buildBookingConfirmationEmail(booking, booking.email, FROM, "https://l8ti.com");
  assert.equal(msg.to, "sam@biz.com");
  assert.deepEqual(msg.from, FROM);
  assert.match(msg.subject, /consultation request/i);
  assert.match(msg.text, /Hi Sam/);
  assert.match(msg.text, /Weekday mornings/);
  assert.match(msg.text, /Mostly weekends are busy/);
  assert.match(msg.text, /https:\/\/l8ti\.com\/plan\/abc123/);
});

test("buildBookingConfirmationEmail omits the plan link when there's no planId", () => {
  const msg = buildBookingConfirmationEmail(
    { name: "Sam", email: "sam@biz.com" },
    "sam@biz.com",
    FROM,
    "https://l8ti.com"
  );
  assert.match(msg.text, /Hi Sam/);
  assert.doesNotMatch(msg.text, /\/plan\//);
});

test("buildVerifyCodeEmail puts the code in subject + body", () => {
  const msg = buildVerifyCodeEmail("owner@biz.com", "123456", FROM);
  assert.equal(msg.to, "owner@biz.com");
  assert.deepEqual(msg.from, FROM);
  assert.match(msg.subject, /123456/);
  assert.match(msg.text, /123456/);
  assert.match(msg.text, /expires/i);
});

test("buildPlanEmail includes headline, quick wins, next step, and link", () => {
  const plan = {
    headline: "Your focused AI plan",
    quick_wins: [
      { title: "Automate FAQs", description: "Stand up an assistant.", monthly_cost: "$0-20/mo" },
      { title: "Batch social", description: "Draft a week at once." },
    ],
    next_step: "Pick the easiest win.",
  };
  const msg = buildPlanEmail("owner@biz.com", plan, "https://l8ti.com/plan/abc123", FROM);
  assert.match(msg.text, /Your focused AI plan/);
  assert.match(msg.text, /Automate FAQs/);
  assert.match(msg.text, /\$0-20\/mo/);
  assert.match(msg.text, /Pick the easiest win/);
  assert.match(msg.text, /https:\/\/l8ti\.com\/plan\/abc123/);
});

test("buildPlanEmail tolerates a sparse plan", () => {
  const msg = buildPlanEmail("owner@biz.com", {}, "https://l8ti.com/plan/x", FROM);
  assert.match(msg.text, /https:\/\/l8ti\.com\/plan\/x/);
});
