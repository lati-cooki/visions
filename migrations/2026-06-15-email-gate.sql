-- migrations/2026-06-15-email-gate.sql
-- One-time migration for the already-provisioned `visions` D1:
--   npm run db:migrate:remote   (and :local for a pre-existing local DB)
--
-- wrangler runs this whole file as one batch and stops at the first error. The only
-- non-idempotent statement is the `ALTER TABLE ... ADD COLUMN` (it errors with
-- "duplicate column name" if the column already exists), so it is placed LAST: on a
-- re-run, every idempotent statement above it still applies before the ALTER aborts the
-- batch. A fresh local DB created from schema.sql already has the column, so the ALTER
-- will abort there harmlessly — that's expected and the other statements are no-ops.

CREATE TABLE IF NOT EXISTS email_verifications (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  consumed_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- The task board is removed; this reserved table was never written to.
DROP TABLE IF EXISTS tasks;

-- Non-idempotent; keep LAST so a re-run still applies everything above before this aborts.
-- idx_plans_email is created here (after the column exists) for the same reason.
ALTER TABLE plans ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS idx_plans_email ON plans(email);
