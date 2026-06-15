// API client.
//
// Scaffold-only phase: the Cloudflare Worker that holds the Anthropic key and builds the
// prompt isn't deployed yet, so when VITE_USE_MOCK is "true" (the default) these return
// local mock data. The fetch paths below are the real contract — once the Worker is live,
// set VITE_USE_MOCK=false and these call it instead, no component changes required.

import { mockPlan, mockChatReply } from "./mockData.js";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Generate a personalized AI plan from a business profile (see lib/profile.js for shape).
export async function generatePlan(profile) {
  if (USE_MOCK) {
    await delay(900);
    return mockPlan(profile);
  }

  const res = await fetch(`${API_BASE}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

// Ask a follow-up question. The backend carries profile + plan headline as context.
export async function sendChat({ profile, headline, history, message }) {
  if (USE_MOCK) {
    await delay(700);
    return mockChatReply(message);
  }

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, headline, history, message }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const data = await res.json();
  return data.reply;
}
