import { json, error, readJson } from "../lib/http.js";
import { validateBooking } from "../lib/validate.js";
import { insertBooking } from "../lib/db.js";
import { sendBookingEmail, sendBookingConfirmationEmail } from "../lib/email.js";
import { newId } from "../lib/ids.js";

// POST /api/booking — persist a consultation request. Returns { ok, id }.
export async function bookingHandler(request, env, ctx) {
  const body = await readJson(request);
  const invalid = validateBooking(body);
  if (invalid) return error(invalid, 400);

  const booking = {
    id: newId(),
    planId: typeof body.planId === "string" ? body.planId : null,
    name: body.name.trim(),
    email: body.email.trim(),
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    preferred: typeof body.preferred === "string" ? body.preferred : "",
    message: typeof body.message === "string" ? body.message.trim() : "",
  };
  await insertBooking(env, booking);

  // Notify the owner and confirm to the customer; a send failure must never fail the
  // booking (the D1 row is the source of truth). Both run after the response via waitUntil.
  const notify = sendBookingEmail(env, booking).catch((e) =>
    console.error("Booking email failed:", e)
  );
  const confirm = sendBookingConfirmationEmail(env, booking).catch((e) =>
    console.error("Booking confirmation email failed:", e)
  );
  if (ctx?.waitUntil) {
    ctx.waitUntil(notify);
    ctx.waitUntil(confirm);
  }

  return json({ ok: true, id: booking.id });
}
