// Booking notification email. A pure composer (unit-tested) plus a thin send wrapper over
// the Cloudflare Email Sending Workers binding (env.EMAIL), so the Worker stays
// zero-dependency (the binding builds the MIME message; no npm packages needed).

import { ApiError } from "./http.js";

// Pure: compose the owner-notification email for a booking. `from` is a { email, name }
// object (the Workers binding shape).
export function buildBookingEmail(booking, to, from) {
  const subject = `New Visions booking: ${booking.name}`;
  const lines = [
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    booking.phone ? `Phone: ${booking.phone}` : null,
    booking.preferred ? `Preferred: ${booking.preferred}` : null,
    booking.planId ? `Plan: ${booking.planId}` : null,
    "",
    booking.message || "(no message)",
  ].filter((line) => line !== null);
  return { to, from, subject, text: lines.join("\n") };
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Send the booking notification via the Email binding. Returns false (no-op) when email is
// not configured, so bookings still succeed without it. Throws on a real send failure; the
// caller wraps this so a failure never fails the booking write.
export async function sendBookingEmail(env, booking) {
  if (!env.EMAIL || !env.BOOKING_NOTIFY_TO || !env.BOOKING_NOTIFY_FROM) return false;
  const msg = buildBookingEmail(booking, env.BOOKING_NOTIFY_TO, {
    email: env.BOOKING_NOTIFY_FROM,
    name: "Visions",
  });
  await env.EMAIL.send({
    to: msg.to,
    from: msg.from,
    replyTo: booking.email || undefined,
    subject: msg.subject,
    text: msg.text,
    html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>`,
  });
  return true;
}

// ── Verification code email (critical path: awaited by the handler) ──
export function buildVerifyCodeEmail(toEmail, code, from) {
  const subject = `Your Visions code: ${code}`;
  const text = [
    `Your verification code is: ${code}`,
    "",
    "Enter this code to get your AI plan. It expires in 10 minutes.",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");
  return { to: toEmail, from, subject, text };
}

export async function sendVerifyCodeEmail(env, toEmail, code) {
  if (!env.EMAIL || !env.VERIFY_EMAIL_FROM) {
    // In dev the handler echoes the code instead, so a missing binding is non-fatal there.
    if (env.VERIFY_DEV_ECHO === "true") return false;
    throw new ApiError("Email is not configured.", 500);
  }
  const msg = buildVerifyCodeEmail(toEmail, code, { email: env.VERIFY_EMAIL_FROM, name: "Visions" });
  await env.EMAIL.send({
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    text: msg.text,
    html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>`,
  });
  return true;
}

// ── Plan delivery email (non-fatal: sent via ctx.waitUntil) ──
export function buildPlanEmail(toEmail, plan, planUrl, from) {
  const wins = (plan?.quick_wins || [])
    .map(
      (w, i) =>
        `${i + 1}. ${w.title}${w.monthly_cost ? ` (${w.monthly_cost})` : ""}\n   ${w.description || ""}`
    )
    .join("\n\n");
  const text = [
    plan?.headline || "Here's your AI plan.",
    "",
    "QUICK WINS",
    wins || "(none)",
    plan?.next_step ? `\nTHIS WEEK\n${plan.next_step}` : null,
    "",
    `View or share your full plan: ${planUrl}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
  return { to: toEmail, from, subject: "Your Visions AI plan", text };
}

export async function sendPlanEmail(env, toEmail, plan, planId) {
  if (!env.EMAIL || !env.VERIFY_EMAIL_FROM) return false;
  const base = (env.SITE_URL || "").replace(/\/$/, "");
  const planUrl = `${base}/plan/${planId}`;
  const msg = buildPlanEmail(toEmail, plan, planUrl, { email: env.VERIFY_EMAIL_FROM, name: "Visions" });
  await env.EMAIL.send({
    to: msg.to,
    from: msg.from,
    subject: msg.subject,
    text: msg.text,
    html: `<pre style="font:inherit;white-space:pre-wrap">${escapeHtml(msg.text)}</pre>`,
  });
  return true;
}
