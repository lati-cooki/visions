-- Visions D1 schema.
--
-- Apply locally:   npm run db:schema:local
-- Apply to prod:   npm run db:schema:remote
-- (wrapping `wrangler d1 execute visions --local|--remote --file=./schema.sql`)
--
-- Idempotent: every statement uses IF NOT EXISTS, so re-running is safe.

-- Generated plans. `recommendations` and `pain_points` are JSON text columns.
CREATE TABLE IF NOT EXISTS plans (
  id              TEXT PRIMARY KEY,
  business_type   TEXT NOT NULL,
  pain_points     TEXT NOT NULL,            -- JSON array of strings
  team_size       TEXT,
  budget          TEXT,
  extra_context   TEXT,
  recommendations TEXT NOT NULL,            -- JSON object (the generated plan)
  created_at      TEXT NOT NULL,
  email           TEXT                      -- verified owner email (added 2026-06-15)
);

-- Consultation booking requests (lead capture).
CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  plan_id        TEXT,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  preferred_time TEXT,
  message        TEXT,
  created_at     TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Email verification codes for plan generation. Raw codes are never stored — only a
-- peppered SHA-256 hash. Rows are single-use (consumed_at) and short-lived (expires_at).
CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

-- Reserved for the Phase 2 provider directory (submission + approval flow). The live
-- directory is served from static config today; this table backs the DB-driven version.
CREATE TABLE IF NOT EXISTS providers (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  focus       TEXT,
  description TEXT,
  url         TEXT,
  badge       TEXT,
  approved    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_plan ON bookings(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_created ON plans(created_at);
CREATE INDEX IF NOT EXISTS idx_plans_email ON plans(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
