import { json, error } from "../lib/http.js";
import { getPlan } from "../lib/db.js";

// GET /api/plan/:id — load a saved plan for the shareable plan page.
export async function getPlanHandler(id, env) {
  const record = await getPlan(env, id);
  if (!record) return error("Plan not found.", 404);
  return json(record);
}
