// D1 access. Thin wrappers around the prepared-statement API (env.DB). JSON columns
// (pain_points, recommendations) are stringified on write and parsed on read.

const safeParse = (text, fallback) => {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

// Midnight-UTC ISO string for the day containing `nowMs`. Used for daily-cap windows;
// ISO timestamps sort lexicographically, so `created_at >= startOfUtcDayIso(...)` works.
export function startOfUtcDayIso(nowMs) {
  const d = new Date(nowMs);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

export async function insertPlan(env, { id, profile, recommendations }) {
  await env.DB.prepare(
    `INSERT INTO plans
       (id, business_type, pain_points, team_size, budget, extra_context, recommendations, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      profile.businessType,
      JSON.stringify(profile.painPoints || []),
      profile.teamSize || "",
      profile.budget || "",
      profile.extraContext || "",
      JSON.stringify(recommendations),
      new Date().toISOString()
    )
    .run();
}

export async function getPlan(env, id) {
  const row = await env.DB.prepare(
    `SELECT id, business_type, pain_points, team_size, budget, extra_context, recommendations, created_at
       FROM plans WHERE id = ?`
  )
    .bind(id)
    .first();

  if (!row) return null;

  return {
    id: row.id,
    profile: {
      businessType: row.business_type,
      painPoints: safeParse(row.pain_points, []),
      teamSize: row.team_size,
      budget: row.budget,
      extraContext: row.extra_context,
    },
    plan: safeParse(row.recommendations, null),
    createdAt: row.created_at,
  };
}

export async function insertBooking(env, booking) {
  await env.DB.prepare(
    `INSERT INTO bookings
       (id, plan_id, name, email, phone, preferred_time, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      booking.id,
      booking.planId || null,
      booking.name,
      booking.email,
      booking.phone || "",
      booking.preferred || "",
      booking.message || "",
      new Date().toISOString()
    )
    .run();
}
