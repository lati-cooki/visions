#!/usr/bin/env node
// scripts/activate-email-gate.mjs
//
// One-shot activation of the Visions email-verification gate in production.
// Run once after deploying the merged email-gate code for the first time:
//
//   npm run activate
//
// What it does:
//   1. Checks wrangler authentication (exits with instructions if not auth'd)
//   2. Lists existing Worker secrets so it never overwrites already-set ones
//   3. Generates and sets VERIFY_TOKEN_SECRET (random 32-byte hex) if missing
//   4. Generates and sets VERIFY_CODE_PEPPER  (random 32-byte hex) if missing
//   5. Runs the email-gate D1 migration against the production database
//   6. Deploys the built Worker (npm run build + wrangler deploy)
//
// Prerequisites:
//   - CLOUDFLARE_API_TOKEN env var (or `wrangler login` in an interactive shell)
//   - ANTHROPIC_API_KEY Worker secret already set (wrangler secret put ANTHROPIC_API_KEY)
//   - l8ti.com onboarded to Cloudflare Email Sending (dashboard: Compute → Email Service →
//     Email Sending → Onboard Domain) — activate-email-gate cannot do this step for you

import { execSync, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const WORKER = "visions";

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
  } catch (err) {
    throw new Error(err.stderr?.trim() || err.message);
  }
}

function wrangler(...args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function step(label) {
  console.log(`\n→ ${label}`);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.log(`  ⚠ ${msg}`);
}

// ── 1. Auth check ─────────────────────────────────────────────────────────────
step("Checking wrangler authentication");
try {
  const whoami = wrangler("whoami");
  if (whoami.includes("not authenticated") || whoami.includes("not logged")) {
    throw new Error("Not authenticated");
  }
  ok(`Authenticated (${whoami.match(/Logged in as (.+)/)?.[1] || "unknown"})`);
} catch {
  console.error(`
  ✗ Wrangler is not authenticated.

  To fix:
    Option A (Cursor Cloud Agents): add CLOUDFLARE_API_TOKEN to your secrets at
      https://cursor.com/settings → Cloud Agents → Secrets
    Option B (local terminal): run
      npx wrangler login
  `);
  process.exit(1);
}

// ── 2. List existing secrets ──────────────────────────────────────────────────
step("Reading existing Worker secrets");
let existingSecrets = [];
try {
  const raw = wrangler("secret", "list", "--name", WORKER);
  // Output is a JSON array of { name, type } objects.
  existingSecrets = JSON.parse(raw).map((s) => s.name);
  ok(`Found ${existingSecrets.length} existing secret(s): ${existingSecrets.join(", ") || "(none)"}`);
} catch (e) {
  warn(`Could not list secrets (${e.message}). Will attempt to set all required ones.`);
}

// ── 3 & 4. Generate + set missing secrets ────────────────────────────────────
const REQUIRED = ["VERIFY_TOKEN_SECRET", "VERIFY_CODE_PEPPER"];
for (const name of REQUIRED) {
  step(`Secret: ${name}`);
  if (existingSecrets.includes(name)) {
    ok(`Already set — skipping (delete it with 'wrangler secret delete ${name}' to rotate)`);
    continue;
  }
  const value = randomBytes(32).toString("hex");
  try {
    // Pipe the value into wrangler non-interactively.
    execFileSync("npx", ["wrangler", "secret", "put", name, "--name", WORKER], {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    ok(`Set (${value.slice(0, 8)}… — 64-char hex, not stored here)`);
  } catch (err) {
    console.error(`  ✗ Failed to set ${name}: ${err.stderr?.trim() || err.message}`);
    process.exit(1);
  }
}

// ── 5. Run D1 migration ───────────────────────────────────────────────────────
step("Running email-gate D1 migration against production");
try {
  const out = wrangler(
    "d1", "execute", WORKER,
    "--remote",
    "--file=./migrations/2026-06-15-email-gate.sql"
  );
  ok("Migration applied (ALTER TABLE errors are expected on a fresh DB — ignored)");
  if (process.env.VERBOSE) console.log(out);
} catch (err) {
  const msg = err.message || "";
  // "duplicate column name: email" is expected when schema.sql already created the column.
  if (msg.includes("duplicate column") || msg.includes("already exists")) {
    ok("Column already exists — migration is a no-op (this is fine)");
  } else {
    console.error(`  ✗ Migration failed: ${msg}`);
    process.exit(1);
  }
}

// ── 6. Build + deploy ─────────────────────────────────────────────────────────
step("Building frontend and deploying Worker");
try {
  run("npm run build", { stdio: "inherit" });
  wrangler("deploy");
  ok("Deployed successfully");
} catch (err) {
  console.error(`  ✗ Deploy failed: ${err.message}`);
  process.exit(1);
}

// ── Done ──────────────────────────────────────────────────────────────────────
console.log(`
✅  Email gate activated!

Remaining manual step (Cloudflare Dashboard — cannot be scripted):
  Compute → Email Service → Email Sending → Onboard Domain → l8ti.com
  This lets 'plans@l8ti.com' and 'bookings@l8ti.com' actually deliver email.
  Until it's done the gate code-checks correctly but emails won't arrive.

To verify the gate is live:
  curl -s https://l8ti.com/api/health   # should return {"ok":true}
  # Then test the flow at https://l8ti.com
`);
