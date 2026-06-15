// HTTP helpers shared by all handlers: JSON responses, CORS, body parsing, and a small
// ApiError type so handlers can throw with a status and have it mapped to a response.

// Permissive CORS. In production the Worker serves the frontend on the same origin, so
// this mainly eases split-origin local testing. NOTE: it does not gate abuse of the
// plan-generation endpoint (which spends API credits) — add Turnstile / rate limiting
// before a public launch.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
