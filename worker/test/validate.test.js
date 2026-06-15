import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateProfile,
  normalizeProfile,
  validateChat,
  validateBooking,
  validateVerifyStart,
  validateVerifyCheck,
} from "../src/lib/validate.js";

test("validateProfile accepts a well-formed profile", () => {
  assert.equal(
    validateProfile({
      businessType: "Restaurant",
      painPoints: ["Getting more customers"],
      teamSize: "2-5 people",
      budget: "Under $100/mo",
    }),
    null
  );
});

test("validateProfile rejects bad input", () => {
  assert.match(validateProfile(null), /Missing request body/);
  assert.match(validateProfile({ painPoints: ["x"] }), /businessType/);
  assert.match(validateProfile({ businessType: "X", painPoints: [] }), /pain point/);
  assert.match(
    validateProfile({ businessType: "X", painPoints: Array(11).fill("p") }),
    /Too many/
  );
  assert.match(
    validateProfile({ businessType: "X", painPoints: ["p"], extraContext: "z".repeat(2001) }),
    /extraContext/
  );
});

test("normalizeProfile trims and defaults", () => {
  const p = normalizeProfile({
    businessType: "  Retail  ",
    painPoints: [" leads ", ""],
    extraContext: "  hi  ",
  });
  assert.equal(p.businessType, "Retail");
  assert.deepEqual(p.painPoints, ["leads"]);
  assert.equal(p.teamSize, "");
  assert.equal(p.budget, "");
  assert.equal(p.extraContext, "hi");
});

test("validateChat checks the message", () => {
  assert.equal(validateChat({ message: "How do I start?" }), null);
  assert.match(validateChat({ message: "" }), /message is required/);
  assert.match(validateChat({ message: "x".repeat(2001) }), /too long/);
  assert.match(validateChat({ message: "ok", history: "nope" }), /history/);
});

test("validateBooking requires name and a valid email", () => {
  assert.equal(validateBooking({ name: "Sam", email: "sam@biz.com" }), null);
  assert.match(validateBooking({ email: "sam@biz.com" }), /Name is required/);
  assert.match(validateBooking({ name: "Sam", email: "not-an-email" }), /valid email/);
});

test("validateVerifyStart requires a valid email", () => {
  assert.equal(validateVerifyStart({ email: "owner@biz.com" }), null);
  assert.match(validateVerifyStart(null), /Missing request body/);
  assert.match(validateVerifyStart({ email: "nope" }), /valid email/);
  assert.match(validateVerifyStart({ email: "a@b.co".padEnd(260, "x") }), /too long/);
});

test("validateVerifyCheck requires email + 6-digit code", () => {
  assert.equal(validateVerifyCheck({ email: "owner@biz.com", code: "123456" }), null);
  assert.equal(validateVerifyCheck({ email: "owner@biz.com", code: " 123456 " }), null);
  assert.match(validateVerifyCheck({ email: "owner@biz.com", code: "12345" }), /6-digit/);
  assert.match(validateVerifyCheck({ email: "owner@biz.com", code: "abcdef" }), /6-digit/);
  assert.match(validateVerifyCheck({ email: "nope", code: "123456" }), /valid email/);
});
