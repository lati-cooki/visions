# Visions

**Small Business AI Advisor** — an AI-as-a-service web app that gives small business owners a
personalized AI adoption plan in about 60 seconds. Answer a 3-step intake (business type → pain
points → team size & budget) and get tailored quick wins, a custom-agent idea, actionable tasks,
and a directory of local experts. San Diego is the flagship market.

> Status: **scaffold**. The UI is fully built and demoable on mock data. The backend (which holds
> the Anthropic key and generates real plans) is not wired up yet — see [`CLAUDE.md`](./CLAUDE.md)
> for the roadmap.

## Stack

- **Vite + React** frontend
- **Tailwind CSS** for styling
- Planned backend: **Cloudflare Workers + D1 + Pages** (server-side Anthropic API)

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

The app runs on local mock data out of the box (`VITE_USE_MOCK=true`). Copy `.env.example` to
`.env` to configure. Flip `VITE_USE_MOCK=false` and set `VITE_API_BASE` once the backend Worker
is deployed.

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the full structure, design system, architecture decisions, and
the production roadmap (Phases 1–3). The original Claude.ai prototype is archived at
`docs/prototype/sd-biz-ai-advisor.jsx`.
