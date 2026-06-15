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
  created_at      TEXT NOT NULL
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

-- Reserved for future authenticated task sync. Tasks are client-local (localStorage)
-- in this phase; this table is defined now so the migration is in place when sync lands.
CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT,
  title      TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'todo',
  source     TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
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
