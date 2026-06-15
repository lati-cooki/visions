// API client.
//
// When VITE_USE_MOCK is "true" (the default in local `npm run dev`), these return local mock
// data so the UI is demoable without a backend. Production builds set VITE_USE_MOCK=false
// (.env.production) and these call the Cloudflare Worker, which holds the Anthropic key and
// persists to D1. The fetch paths below are the real contract.

import { mockPlan, mockSavedPlan, mockChatReply } from "./mockData.js";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mockId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

// Generate + persist a plan. Returns { id, plan } — the id powers shareable /plan/:id links.
// turnstileToken gates the credit-spending endpoint server-side (ignored in mock mode).
export async function generatePlan(profile, turnstileToken) {
  if (USE_MOCK) {
    await delay(900);
    return { id: mockId(), plan: mockPlan(profile) };
  }
  return postJson("/api/plan", { ...profile, turnstileToken });
}

// Load a saved plan. Returns { id, profile, plan, createdAt }.
export async function getPlan(id) {
  if (USE_MOCK) {
    await delay(500);
    return mockSavedPlan(id);
  }
  const res = await fetch(`${API_BASE}/api/plan/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

// Ask a follow-up question. The backend carries profile + plan headline as context.
export async function sendChat({ profile, headline, history, message }) {
  if (USE_MOCK) {
    await delay(700);
    return mockChatReply(message);
  }
  const data = await postJson("/api/chat", { profile, headline, history, message });
  return data.reply;
}

// Submit a consultation booking. Returns { ok, id }.
export async function saveBooking(payload) {
  if (USE_MOCK) {
    await delay(500);
    return { ok: true, id: mockId() };
  }
  return postJson("/api/booking", payload);
}
