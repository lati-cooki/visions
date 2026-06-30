// worker/src/handlers/adminPlans.js
import { json, csv } from "../lib/http.js";
import { verifyAccessJwt } from "../lib/access.js";
import { listPlans } from "../lib/db.js";
import { toCsv } from "../lib/csv.js";

const COLUMNS = [
  { key: "business_type", label: "Business" },
  { key: "email", label: "Email" },
  { key: "team_size", label: "Team size" },
  { key: "budget", label: "Budget" },
  { key: "headline", label: "Headline" },
  { key: "id", label: "Plan ID" },
  { key: "created_at", label: "Created" },
];

// GET /api/admin/plans[?format=csv] — Access-gated plan list (summary fields).
// Response includes `total` and `capped` so the UI can surface "showing X of Y".
export async function adminPlansHandler(request, env) {
  await verifyAccessJwt(env, request);
  const { rows, total, capped } = await listPlans(env);
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return csv(toCsv(rows, COLUMNS), "plans.csv");
  }
  return json({ plans: rows, total, capped });
}
