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

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return preflight();

    const url = new URL(request.url);
    const route = resolveRoute(request.method, url.pathname);
    if (!route) return error("Not found.", 404);

    // Per-IP rate limiting on the credit-spending endpoints (backstop behind Turnstile).
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (route.name === "plan" && env.PLAN_RATE_LIMITER) {
      const { success } = await env.PLAN_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
    if (route.name === "chat" && env.CHAT_RATE_LIMITER) {
      const { success } = await env.CHAT_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
    if (route.name === "verifyStart" && env.VERIFY_START_RATE_LIMITER) {
      const { success } = await env.VERIFY_START_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }
    if (route.name === "verifyCheck" && env.VERIFY_CHECK_RATE_LIMITER) {
      const { success } = await env.VERIFY_CHECK_RATE_LIMITER.limit({ key: ip });
      if (!success) return error("Too many requests. Please slow down and try again.", 429);
    }

    try {
      switch (route.name) {
        case "health":
          return json({ ok: true });
        case "plan":
          return await planHandler(request, env, ctx);
        case "verifyStart":
          return await verifyStartHandler(request, env);
        case "verifyCheck":
          return await verifyCheckHandler(request, env);
        case "getPlan":
          return await getPlanHandler(route.id, env);
        case "chat":
          return await chatHandler(request, env);
        case "booking":
          return await bookingHandler(request, env, ctx);
        case "adminBookings":
          return await adminBookingsHandler(request, env);
        case "adminPlans":
          return await adminPlansHandler(request, env);
        case "adminExport":
          return await adminExportHandler(request, env);
        default:
          return error("Not found.", 404);
      }
    } catch (err) {
      if (err instanceof ApiError) return error(err.message, err.status);
      console.error("Unhandled error:", err);
      return error("Internal server error.", 500);
    }
  },
};
