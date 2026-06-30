// Visions API Worker.
//
// Serves /api/* (this Worker) and the static frontend (Cloudflare Static Assets, configured
// in wrangler.toml with run_worker_first = ["/api/*"], so only API routes reach this code).
// Holds the Anthropic key server-side and persists to D1.

import { json, error, preflight, ApiError } from "./lib/http.js";
import { resolveRoute } from "./lib/router.js";
import { planHandler } from "./handlers/plan.js";
import { getPlanHandler } from "./handlers/getPlan.js";
import { chatHandler } from "./handlers/chat.js";
import { bookingHandler } from "./handlers/booking.js";
import { verifyStartHandler } from "./handlers/verifyStart.js";
import { verifyCheckHandler } from "./handlers/verifyCheck.js";
import { adminBookingsHandler } from "./handlers/adminBookings.js";
import { adminPlansHandler } from "./handlers/adminPlans.js";
import { adminExportHandler } from "./handlers/adminExport.js";
import { deleteExpiredVerifications } from "./lib/db.js";

// Compute the Access-Control-Allow-Origin value for this request.
// In production (SITE_URL set), only requests from that origin are allowed cross-origin.
// Without SITE_URL (local dev) the origin is permissive ("*").
function allowedOrigin(requestOrigin, siteUrl) {
  if (!siteUrl) return "*";
  const site = siteUrl.replace(/\/$/, "");
  return requestOrigin === site ? site : null;
}

// Attach CORS + security headers to every outgoing response. Called unconditionally so
// non-API routes that bubble up from the worker also get the right headers.
function withCors(response, requestOrigin, siteUrl) {
  const headers = new Headers(response.headers);
  const origin = allowedOrigin(requestOrigin, siteUrl);
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const requestOrigin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return withCors(preflight(), requestOrigin, env.SITE_URL);
    }

    const url = new URL(request.url);
    const route = resolveRoute(request.method, url.pathname);
    if (!route) return withCors(error("Not found.", 404), requestOrigin, env.SITE_URL);

    // Per-IP rate limiting on the credit-spending endpoints (backstop behind Turnstile).
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (route.name === "plan" && env.PLAN_RATE_LIMITER) {
      const { success } = await env.PLAN_RATE_LIMITER.limit({ key: ip });
      if (!success)
        return withCors(
          error("Too many requests. Please slow down and try again.", 429),
          requestOrigin,
          env.SITE_URL
        );
    }
    if (route.name === "chat" && env.CHAT_RATE_LIMITER) {
      const { success } = await env.CHAT_RATE_LIMITER.limit({ key: ip });
      if (!success)
        return withCors(
          error("Too many requests. Please slow down and try again.", 429),
          requestOrigin,
          env.SITE_URL
        );
    }
    if (route.name === "booking" && env.BOOKING_RATE_LIMITER) {
      const { success } = await env.BOOKING_RATE_LIMITER.limit({ key: ip });
      if (!success)
        return withCors(
          error("Too many requests. Please slow down and try again.", 429),
          requestOrigin,
          env.SITE_URL
        );
    }
    if (route.name === "verifyStart" && env.VERIFY_START_RATE_LIMITER) {
      const { success } = await env.VERIFY_START_RATE_LIMITER.limit({ key: ip });
      if (!success)
        return withCors(
          error("Too many requests. Please slow down and try again.", 429),
          requestOrigin,
          env.SITE_URL
        );
    }
    if (route.name === "verifyCheck" && env.VERIFY_CHECK_RATE_LIMITER) {
      const { success } = await env.VERIFY_CHECK_RATE_LIMITER.limit({ key: ip });
      if (!success)
        return withCors(
          error("Too many requests. Please slow down and try again.", 429),
          requestOrigin,
          env.SITE_URL
        );
    }

    let response;
    try {
      switch (route.name) {
        case "health":
          response = json({ ok: true });
          break;
        case "plan":
          response = await planHandler(request, env, ctx);
          break;
        case "verifyStart":
          response = await verifyStartHandler(request, env);
          break;
        case "verifyCheck":
          response = await verifyCheckHandler(request, env);
          break;
        case "getPlan":
          response = await getPlanHandler(route.id, env);
          break;
        case "chat":
          response = await chatHandler(request, env);
          break;
        case "booking":
          response = await bookingHandler(request, env, ctx);
          break;
        case "adminBookings":
          response = await adminBookingsHandler(request, env);
          break;
        case "adminPlans":
          response = await adminPlansHandler(request, env);
          break;
        case "adminExport":
          response = await adminExportHandler(request, env);
          break;
        default:
          response = error("Not found.", 404);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        response = error(err.message, err.status);
      } else {
        console.error("Unhandled error:", err);
        response = error("Internal server error.", 500);
      }
    }

    return withCors(response, requestOrigin, env.SITE_URL);
  },

  // Scheduled cleanup: delete expired/consumed email_verifications older than 7 days.
  // Bind a cron trigger in wrangler.toml: `crons = ["0 3 * * *"]`
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      deleteExpiredVerifications(env).catch((e) =>
        console.error("Scheduled verification cleanup failed:", e)
      )
    );
  },
};
