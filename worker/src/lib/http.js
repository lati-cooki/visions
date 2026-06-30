// HTTP helpers shared by all handlers: JSON responses, CORS, body parsing, and a small
// ApiError type so handlers can throw with a status and have it mapped to a response.
//
// CORS headers are NOT set here — they are applied by the top-level fetch handler in
// index.js so origin restrictions can be computed per-request from env.SITE_URL.

export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function download(body, filename, contentType) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function csv(text, filename) {
  return download(text, filename, "text/csv; charset=utf-8");
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function preflight() {
  return new Response(null, { status: 204 });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
