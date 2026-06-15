# Visions → l8ti.com Cutover & Pre-Launch Hardening — Design

**Date:** 2026-06-15
**Owner:** Troy Latimer / Lati Cooki LLC
**Status:** Approved (design phase)

## Goal

Put **Visions** on the `l8ti.com` apex, relocate the existing **Sobriety Pursuit** site
to `sp.l8ti.com`, and harden the public Visions API before exposing the apex publicly.

## Context: what l8ti.com is today

`l8ti.com` is currently served by the **`l8ticom`** Cloudflare Worker (Sobriety Pursuit):

- Static SPA served from the `ASSETS` binding for all non-API routes.
- `POST /ia909` — an Anthropic proxy gated to "IA-909 transmissions" (system prompt must
  contain `"IA-909"`), using a server-held `ANTHROPIC_API_KEY` secret. Allowed models:
  `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`; `max_tokens` capped at 1024.
- A `scheduled` cron heartbeat.

**Putting Visions on the apex removes Sobriety Pursuit from it.** Decision: Sobriety Pursuit
moves to `sp.l8ti.com` (same `l8ticom` Worker, unchanged code — just a new hostname).

## End-state architecture

| Host | Worker | Contents |
|---|---|---|
| `l8ti.com`, `www.l8ti.com` | `visions` (new) | React build + `/api/*` on D1 `visions` |
| `sp.l8ti.com` | `l8ticom` (existing, code unchanged) | Sobriety Pursuit SPA + `/ia909` + cron |

Two independent Workers, two hostnames, each with its own `ANTHROPIC_API_KEY` secret.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cutover style | Deploy → verify on workers.dev → harden → move SP → cut apex | Reversible; apex flips last |
| Generation path | Messages API (`USE_MANAGED_AGENT="false"`) | Schema-guaranteed JSON, faster, no agent-definition step |
| Abuse protection | Turnstile **and** per-IP rate limit on `/api/plan` (+ `/api/chat`) | Defense-in-depth on credit-spending endpoints |
| Booking notification | Cloudflare Email Service | All-in on Cloudflare; owner gets an email when a booking row lands |
| SP relocation | `sp.l8ti.com` | Short; matches local `sp` project folder |
| Driver | Claude drives wrangler + Cloudflare changes | User in the loop on each outward-facing step |

## Cutover sequence

1. **Repo prep** — `USE_MANAGED_AGENT="false"`; remove/dormant `AGENT_ID`/`AGENT_ENV_ID`.
   `npm install` → `npm test` (21 green) → `npm run build`.
2. **Secret + deploy to workers.dev** — `wrangler secret put ANTHROPIC_API_KEY`; `npm run deploy`.
   Lands `visions` at `visions.<account>.workers.dev` (not yet on the apex).
3. **Verify** — `/api/health` → `{ok:true}`; run a plan in the UI; confirm a `plans` row;
   open `/plan/:id`; submit a booking; confirm a `bookings` row.
4. **Harden** (below) — redeploy; re-verify on workers.dev.
5. **Move SP** — bind `sp.l8ti.com` to `l8ticom`; confirm SP + `/ia909` work there.
6. **Cut apex** — bind `l8ti.com` + `www` to `visions`. Rollback = re-point apex to `l8ticom`.

> **Execution-time discovery:** confirm how the apex is currently bound to `l8ticom`
> (Custom Domain vs Route) before steps 5–6; that determines exact commands. Surface before changing.

## Hardening design

### Turnstile on `/api/plan`
- Client: Turnstile widget on intake submit; token sent with the plan request.
- Server: siteverify in the Worker before any Anthropic call; reject on failure.
- Secrets: Turnstile site key (client, public) + secret key (Worker secret).

### Rate limiting
- Per-IP cap on `/api/plan` and `/api/chat` (credit-spending). Behind Turnstile as a second layer.
- Implementation chosen at plan time (Workers native rate-limit binding preferred; keep zero-dep).

### Booking email (Cloudflare Email Service)
- On a successful `POST /api/booking` (after the D1 write), send the owner a notification.
- Keeps the D1 row as source of truth; email is additive and must not fail the booking on send error.
- Needs: sender/destination config + Cloudflare email setup (verified per the email-service skill).

## Constraints (unchanged)
- Worker stays zero-dependency, ESM module-worker, raw `fetch`.
- Tests are `node --test`. Anthropic key server-side only.

## Open items needing user input at execution
- `ANTHROPIC_API_KEY` for the Visions workspace (paste into `wrangler secret put`).
- Turnstile site/secret keys (created during setup).
- Booking-alert destination email address + Cloudflare email sender/route config.
