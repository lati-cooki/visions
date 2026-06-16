# Visions

**Small Business AI Advisor** — an AI-as-a-service web app that gives small business owners a
personalized AI adoption plan in about a minute. Answer a short intake (business type → pain
points → team size & budget), verify your email, and get tailored quick wins, a custom-agent
idea, and a "this week" next step — shown on screen **and emailed to you**. Plans are shareable
via a link, with a follow-up chat and a directory of local experts. San Diego is the flagship
market (the city lives in config, so new markets drop in without a rewrite).

> Status: **live.** Deployed to Cloudflare and serving **[l8ti.com](https://l8ti.com)** (apex +
> `www`). Phase 1 complete: full intake → plan flow, email-verification cost gate, booking flow
> with email notifications, and an Access-protected admin console. See
> [`CLAUDE.md`](./CLAUDE.md) for the deep dive, architecture decisions, and roadmap.

## What it does

- **Intake → plan.** A 4-step flow (business type → pain points → team & budget → email
  verification) generates a personalized plan with Claude: a headline, 3–4 ranked quick wins
  (tools, monthly cost, effort, a concrete action), a custom-agent opportunity, and a next step.
- **Plan delivery.** The plan renders in the app and is emailed to the verified address. Every
  plan has a shareable `/plan/:id` link and a grounded follow-up chat.
- **Bookings.** A consultation request persists to the database, emails the owner, and sends the
  customer a confirmation.
- **Admin console.** `/admin` (behind Cloudflare Access) lists bookings and plans, with per-table
  CSV export and a one-click "Export all data" complete JSON backup.

## Abuse & cost protection

Plan generation spends real API credits, so it's gated in layers — the daily caps are the hard
ceiling:

- **Email verification** in front of generation: Cloudflare **Turnstile** on `/api/verify/start`
  → a 6-digit code → a short-lived HMAC token that `/api/plan` requires.
- **Daily spend caps** counted from real plan rows: per-email (default 3/day) + a global cap
  (default 200/day, ~$10) — the actual guarantee against runaway spend.
- **Per-IP rate limiting** (Workers Rate Limiting) on the verify + plan endpoints.
- The Anthropic API key is **server-side only** (a Worker secret), never in the client bundle.

## Stack

- **Vite + React + Tailwind** frontend — client-side routing (`/`, `/plan/:id`, `/admin`)
- **Cloudflare Worker** backend — zero-dependency, raw `fetch`; serves `/api/*` and the static
  frontend (SPA fallback so `/plan/:id` resolves)
- **Cloudflare D1** — plans + bookings persistence (+ short-lived email-verification codes)
- **Claude** (`claude-sonnet-4-6`) with structured outputs for reliable plan JSON
- **Cloudflare Email Sending** (verification codes, plan delivery, booking emails), **Turnstile**
  (bot protection), **Workers Rate Limiting**, and **Cloudflare Access** (admin auth)

## API

| Method + path            | Purpose                                                           |
|--------------------------|------------------------------------------------------------------|
| `GET  /api/health`       | health check                                                     |
| `POST /api/verify/start` | Turnstile-gated; email a 6-digit verification code               |
| `POST /api/verify/check` | exchange email + code for a short-lived HMAC token               |
| `POST /api/plan`         | generate + persist a plan (requires the token; caps enforced)    |
| `GET  /api/plan/:id`     | load a saved plan (powers shareable links)                       |
| `POST /api/chat`         | grounded follow-up chat about a plan                             |
| `POST /api/booking`      | capture a consultation request (emails owner + customer)         |
| `GET  /api/admin/bookings` · `…/plans` | Access-gated lists (JSON, or `?format=csv`)        |
| `GET  /api/admin/export` | Access-gated complete JSON backup of all bookings + plans        |

`src/lib/api.js` is the client for this contract; in `npm run dev` it returns mock data
(`VITE_USE_MOCK=true`) so the whole app is demoable without a backend, key, or third-party setup.

## Getting started

```bash
npm install

npm run dev      # frontend on mock data — http://localhost:5173 (no key/services needed)
npm test         # backend tests (node --test)
npm run build    # production build → dist/
```

Run the full stack locally (real API + local D1):

```bash
cp .dev.vars.example .dev.vars   # ANTHROPIC_API_KEY + dev flags (VERIFY_DEV_ECHO, ACCESS_DEV_BYPASS, …)
npm run db:schema:local          # create the local D1 schema
npm run db:migrate:local         # apply migrations (email-gate)
npm run build && npm run worker:dev   # http://localhost:8787
```

In local dev, `VERIFY_DEV_ECHO=true` returns the verification code in the response (instead of
emailing it), and `ACCESS_DEV_BYPASS=true` skips the admin Access check — so the gated flows are
exercisable without Turnstile, Email Sending, or Cloudflare Access configured.

## Deploy

```bash
# one-time secrets (server-side)
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put VERIFY_TOKEN_SECRET   # HMAC key for verification tokens
wrangler secret put VERIFY_CODE_PEPPER    # pepper for hashing verification codes

npm run db:migrate:remote                 # apply the email-gate migration (run once)
npm run deploy                            # vite build + wrangler deploy
```

Two dashboard-side prerequisites for the gated features to function in production:

- **Email Sending:** onboard `l8ti.com` (Compute → Email Service → Email Sending) so verification,
  plan, and booking emails deliver.
- **Admin Access:** create a Cloudflare Access self-hosted app covering `l8ti.com/admin*` +
  `l8ti.com/api/admin/*` (policy = allow your email), then set `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`
  in `wrangler.toml` and redeploy. The Worker also verifies the Access JWT as defense-in-depth.

## More

See [`CLAUDE.md`](./CLAUDE.md) for the project structure, full architecture decisions, design
system, prompt-engineering notes, and the Phase 1–3 roadmap. Design specs and implementation plans
live under [`docs/superpowers/`](./docs/superpowers/); the original Claude.ai prototype is archived
at `docs/prototype/sd-biz-ai-advisor.jsx`.
