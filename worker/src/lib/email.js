// Booking notification email. A pure composer (unit-tested) plus a thin send wrapper over
// the Cloudflare Email Sending Workers binding (env.EMAIL), so the Worker stays
// zero-dependency (the binding builds the MIME message; no npm packages needed).

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
