import { json, error, readJson } from "../lib/http.js";
import { validateBooking } from "../lib/validate.js";
import { insertBooking } from "../lib/db.js";
import { newId } from "../lib/ids.js";

// POST /api/booking — persist a consultation request. Returns { ok, id }.
export async function bookingHandler(request, env) {
  const body = await readJson(request);
  const invalid = validateBooking(body);
  if (invalid) return error(invalid, 400);

  const id = newId();
  await insertBooking(env, {
    id,
    planId: typeof body.planId === "string" ? body.planId : null,
    name: body.name.trim(),
    email: body.email.trim(),
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    preferred: typeof body.preferred === "string" ? body.preferred : "",
    message: typeof body.message === "string" ? body.message.trim() : "",
  });
  return json({ ok: true, id });
}
