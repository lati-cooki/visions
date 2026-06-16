// worker/src/handlers/adminBookings.js
import { json, csv } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listBookings } from "../lib/db.js";
import { toCsv } from "../lib/csv.js";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "preferred_time", label: "Preferred time" },
  { key: "message", label: "Message" },
  { key: "plan_id", label: "Plan ID" },
  { key: "created_at", label: "Created" },
];

// GET /api/admin/bookings[?format=csv] — Access-gated lead list.
export async function adminBookingsHandler(request, env) {
  await verifyAccessJwt(env, request);
  const rows = await listBookings(env);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return csv(toCsv(rows, COLUMNS), "bookings.csv");
  }
  return json({ bookings: rows });
}
