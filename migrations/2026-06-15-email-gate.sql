-- migrations/2026-06-15-email-gate.sql
-- One-time migration for the already-provisioned `visions` D1. Run once per environment:
--   npm run db:migrate:local   (or :remote)
-- ALTER ... ADD COLUMN errors if the column already exists; safe to ignore on re-run.

ALTER TABLE plans ADD COLUMN email TEXT;

CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_email ON plans(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- The task board is removed; this reserved table was never written to.
DROP TABLE IF EXISTS tasks;
