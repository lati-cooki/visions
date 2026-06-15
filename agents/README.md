# Managed Agent definitions

Version-controlled config for the Anthropic Managed Agent that can power Visions instead of
the direct Messages API.

- **Agent:** `agent_011CZtoh5iVJGPjFmdXkSDzo`
- **Environment (sessions run here):** `env_015fkJc7jYAiMT6vN1DMPMBt`
- **Definition:** [`visions-advisor.agent.yaml`](./visions-advisor.agent.yaml)

## Apply the definition to the live agent

Each update creates a new immutable version (sessions can pin to a version). The `ant` CLI is
the simplest path; it needs `ant auth login` or `ANTHROPIC_API_KEY` for the workspace that owns
the agent — neither is available in the Claude Code environment, so this is run where you have
credentials.

```bash
# current version → optimistic-lock the update
V=$(ant beta:agents retrieve --agent-id agent_011CZtoh5iVJGPjFmdXkSDzo --transform version -r)

ant beta:agents update --agent-id agent_011CZtoh5iVJGPjFmdXkSDzo --version "$V" \
    < agents/visions-advisor.agent.yaml
```

## How the backend would use it (not yet wired)

Per request, the Worker would:

1. `POST /v1/sessions` — create a session referencing the agent + `env_015fkJc7jYAiMT6vN1DMPMBt`.
2. `POST /v1/sessions/{id}/events` — send the business profile (plan mode) or question (chat mode).
3. Stream `GET /v1/sessions/{id}/events/stream` until `session.status_idle`.
4. Read the final `agent.message` text → parse the plan JSON / return the chat reply.

### Trade-offs vs. the current Messages-API path

The Worker currently calls `/v1/messages` with structured outputs. Switching to the Managed
Agent changes a few things worth a deliberate decision:

- **Still needs Anthropic auth.** Creating sessions requires `x-api-key` (or OAuth/WIF) just like
  the Messages API — the agent abstraction doesn't remove the credential, it changes the shape.
- **No guaranteed structured output.** Sessions don't expose `output_config.format`, so the plan
  JSON is enforced by the system prompt and parsed (with fence tolerance) rather than schema-
  guaranteed. The prototype's parse fragility partially returns.
- **Higher latency / heavier.** Each session provisions a container and streams events — more
  overhead than a single synchronous Messages call for what is pure text generation.

These aren't blockers, just reasons the backend rewire is a separate, deliberate step.
