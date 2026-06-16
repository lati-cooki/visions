// API client.
//
// When VITE_USE_MOCK is "true" (the default in local `npm run dev`), these return local mock
// data so the UI is demoable without a backend. Production builds set VITE_USE_MOCK=false
// (.env.production) and these call the Cloudflare Worker, which holds the Anthropic key and
// persists to D1. The fetch paths below are the real contract.

import {
  mockPlan,
  mockSavedPlan,
  mockChatReply,
  mockAdminBookings,
  mockAdminPlans,
} from "./mockData.js";

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

// Step 1 of the gate: request a 6-digit code (Turnstile-gated server-side). In mock mode
// it returns a fake devCode so `npm run dev` needs no backend/email.
export async function startVerification(email, turnstileToken) {
  if (USE_MOCK) {
    await delay(400);
    return { ok: true, devCode: "000000" };
  }
  return postJson("/api/verify/start", { email, turnstileToken });
}

// Step 2: exchange email + code for a short-lived verification token. Mock accepts anything.
export async function checkVerification(email, code) {
  if (USE_MOCK) {
    await delay(400);
    return { token: "mock-verify-token" };
  }
  return postJson("/api/verify/check", { email, code });
}

// Generate + persist a plan. Returns { id, plan }. The verifyToken proves email verification
// (replaces the old Turnstile token here); ignored in mock mode.
export async function generatePlan(profile, verifyToken) {
  if (USE_MOCK) {
    await delay(900);
    return { id: mockId(), plan: mockPlan(profile) };
  }
  return postJson("/api/plan", { ...profile, verifyToken });
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

// Admin lists (Access-gated server-side). Mock mode returns sample rows so /admin renders
// without a backend or Cloudflare Access.
export async function getAdminBookings() {
  if (USE_MOCK) {
    await delay(300);
    return { bookings: mockAdminBookings() };
  }
  const res = await fetch(`${API_BASE}/api/admin/bookings`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

export async function getAdminPlans() {
  if (USE_MOCK) {
    await delay(300);
    return { plans: mockAdminPlans() };
  }
  const res = await fetch(`${API_BASE}/api/admin/plans`);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}
