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

export async function insertPlan(env, { id, profile, recommendations, email }) {
  await env.DB.prepare(
    `INSERT INTO plans
       (id, business_type, pain_points, team_size, budget, extra_context, recommendations, created_at, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      profile.businessType,
      JSON.stringify(profile.painPoints || []),
      profile.teamSize || "",
      profile.budget || "",
      profile.extraContext || "",
      JSON.stringify(recommendations),
      new Date().toISOString(),
      email || null
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

// ── Email verification codes ──
export async function insertVerification(env, { id, email, codeHash, expiresAt, createdAt }) {
  await env.DB.prepare(
    `INSERT INTO email_verifications (id, email, code_hash, attempts, expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  )
    .bind(id, email, codeHash, expiresAt, createdAt)
    .run();
}

// Most recent unconsumed, unexpired code for an email.
export async function latestActiveVerification(env, email, nowIso) {
  return await env.DB.prepare(
    `SELECT id, email, code_hash, attempts, expires_at, consumed_at, created_at
       FROM email_verifications
      WHERE email = ? AND consumed_at IS NULL AND expires_at > ?
      ORDER BY created_at DESC LIMIT 1`
  )
    .bind(email, nowIso)
    .first();
}

export async function incrementVerificationAttempts(env, id) {
  await env.DB.prepare(
    `UPDATE email_verifications SET attempts = attempts + 1 WHERE id = ?`
  )
    .bind(id)
    .run();
}

export async function consumeVerification(env, id, consumedAtIso) {
  await env.DB.prepare(`UPDATE email_verifications SET consumed_at = ? WHERE id = ?`)
    .bind(consumedAtIso, id)
    .run();
}

// Per-email send throttle: how many codes were requested since `sinceIso`.
export async function recentVerificationCount(env, email, sinceIso) {
  const row = await env.DB.prepare(
    `SELECT count(*) AS n FROM email_verifications WHERE email = ? AND created_at >= ?`
  )
    .bind(email, sinceIso)
    .first();
  return row?.n || 0;
}

// ── Daily caps (counted from successfully persisted plans) ──
export async function countPlansForEmailSince(env, email, sinceIso) {
  const row = await env.DB.prepare(
    `SELECT count(*) AS n FROM plans WHERE email = ? AND created_at >= ?`
  )
    .bind(email, sinceIso)
    .first();
  return row?.n || 0;
}

export async function countPlansSince(env, sinceIso) {
  const row = await env.DB.prepare(`SELECT count(*) AS n FROM plans WHERE created_at >= ?`)
    .bind(sinceIso)
    .first();
  return row?.n || 0;
}
