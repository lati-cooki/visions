// worker/src/handlers/adminExport.js
import { download } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listBookings, listPlansFull } from "../lib/db.js";
import { buildExport, exportFilename } from "../lib/export.js";

// GET /api/admin/export — Access-gated complete JSON backup of all bookings + plans.
export async function adminExportHandler(request, env) {
  await verifyAccessJwt(env, request);
  const [bookings, plans] = await Promise.all([listBookings(env), listPlansFull(env)]);
  const nowIso = new Date().toISOString();
  const payload = buildExport(bookings, plans, nowIso);
  return download(JSON.stringify(payload, null, 2), exportFilename(nowIso), "application/json");
}
