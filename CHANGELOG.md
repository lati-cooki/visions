# Changelog

All notable changes to **Visions**, grouped by phase, newest first. The authoritative record is
the git commit history; this is a curated, human-readable rollup. Dates are UTC.

---

## Launch — l8ti.com cutover & hardening — 2026-06-15

Production launch on a custom domain, with abuse protection and booking notifications.

- **Custom domains:** bound `l8ti.com` (apex) + `www.l8ti.com` as Cloudflare Custom Domains on
  the `visions` Worker. (Sobriety Pursuit moved to `sp.l8ti.com` on a separate `l8ticom` Worker.)
- **Abuse protection:**
  - **Turnstile** on `/api/plan` — widget added to the intake flow (gated on a site key) and
    server-side token verification before a plan is generated.
  - **Per-IP rate limiting** (Workers Rate Limiting, GA) as a backstop: `/api/plan` 5/min,
    `/api/chat` 30/min.
- **Booking notifications:** email the owner when a booking is captured (Cloudflare Email
  Sending), with a configurable destination (`BOOKING_NOTIFY_TO`); bookings still persist if the
  destination is unset.
- **Generation path:** switched to the Messages API (`USE_MANAGED_AGENT="false"`) for
  schema-guaranteed JSON.
- **Docs:** `docs/superpowers/specs/2026-06-15-l8ti-cutover-design.md` (design spec) and
  `docs/superpowers/plans/2026-06-15-l8ti-cutover.md` (implementation plan); launch tasks marked
  done in `CLAUDE.md`. Added `worker/test/turnstile.test.js` + `worker/test/email.test.js`.

## Deployment handoff — 2026-06-15

- Added `docs/transfer-prompt.md` — a self-contained prompt for a terminal Claude Code session
  to deploy and finish launch.

## Design — warm-coastal redesign — 2026-06-15

Applied the Claude Design handoff (claude.ai/design) across every screen in React + Tailwind,
keeping all data/API wiring intact.

- Shared sticky header (logo mark + wordmark + market badge + Start over); vertical
  sand→white→light-blue page shell.
- Landing: two-column hero with a floating "plan preview" card + stat tiles.
- Intake: segmented progress; business types as a line-icon grid with a selected checkmark; pain
  points as checkbox rows with a live count; team/budget chips.
- Results: design tab bar; plan hero (navy gradient + foam glow + chips), action bar, quick-win
  cards (cost + colored effort badge + Action callout + tool tags), warm Custom Agent card + This
  Week card, "V" follow-up chat.
- Tasks: status pills + filter pills + tags. Experts: provider cards (featured ring) + navy Get
  Listed banner. Booking: blurred backdrop, time chips, personalized success state.

## Backend — Managed Agent option — 2026-06-15

- Added a config-gated Managed Agents path (sessions) as an alternative to the Messages API,
  selected by `USE_MANAGED_AGENT`, driving `agent_011CZtoh5iVJGPjFmdXkSDzo` in
  `env_015fkJc7jYAiMT6vN1DMPMBt`.
- Added the version-controlled agent definition `agents/visions-advisor.agent.yaml` + apply guide.

## Full-stack Phase 1 — 2026-06-15

- Zero-dependency Cloudflare Worker backend (raw `fetch`, no SDK): `POST /api/plan`,
  `GET /api/plan/:id`, `POST /api/chat`, `POST /api/booking`, `GET /api/health`. Anthropic key
  held server-side; structured outputs for parseable plans.
- Cloudflare D1 persistence (`plans`, `bookings`; `tasks`/`providers` reserved) — database
  provisioned and schema applied to production.
- Client-side routing: shareable `/plan/:id` links + a load flow; booking persistence.
- `node --test` coverage for the Worker logic (router, validation, prompts, parsing).

## Scaffold — 2026-06-15

- Vite + React + Tailwind project; extracted the Claude.ai prototype into a component
  architecture (intake steps, results tabs, booking modal, shared UI primitives).
- Inline styles → Tailwind (`brand-*` palette); "San Diego" lifted into config; mock mode for
  keyless local dev.

## Initial — 2026-06-13

- Repository created.
