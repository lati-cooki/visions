// Mock plan + chat data for the scaffold-only phase.
//
// The backend Worker (which holds the Anthropic key and builds the prompt) isn't wired up
// yet, so these stand in for real model output. They match the exact JSON shape the real
// endpoint will return, so swapping in the live API is a config flip (VITE_USE_MOCK=false),
// not a component change. The mock leans lightly on the profile so the demo feels personalized.

export function mockPlan(profile) {
  const biz = profile?.businessType || "your business";
  const firstPain = profile?.painPoints?.[0] || "your top priority";

  return {
    headline: `Here's a focused AI starter plan for ${biz} — quick wins first, then a bigger bet.`,
    quick_wins: [
      {
        title: "Automate your customer FAQs",
        description: `Stand up an AI assistant that answers your most common questions so ${firstPain.toLowerCase()} stops eating your day. Start with your top 15 questions and grow from there.`,
        tools: ["Claude", "ChatGPT"],
        effort: "easy",
        monthly_cost: "$0–20/mo",
        task: "Write down your 15 most-asked customer questions and draft answers with Claude.",
      },
      {
        title: "Schedule social content in batches",
        description:
          "Use AI to draft a week of posts in one sitting, then schedule them. Consistency beats perfection, and batching frees up the rest of your week.",
        tools: ["Canva", "Buffer"],
        effort: "medium",
        monthly_cost: "$15–50/mo",
        task: "Block 60 minutes this week to draft and schedule 7 social posts.",
      },
      {
        title: "Connect your tools so data flows automatically",
        description:
          "Wire your booking, payment, and email tools together so you stop copying data by hand. A few automations remove a surprising amount of busywork.",
        tools: ["Zapier", "Make"],
        effort: "advanced",
        monthly_cost: "$20–80/mo",
        task: "List the 3 manual copy-paste tasks you do most and sketch how to automate one.",
      },
    ],
    agent_opportunity: {
      title: `A custom front-desk agent for ${biz}`,
      description:
        "Imagine an AI agent that handles inbound questions, books appointments, and hands off only the tricky cases to you. It would know your hours, services, and pricing, and respond instantly day or night — a 24/7 front desk that never takes a sick day.",
      impact:
        "Could reclaim 5–10 hours/week and capture leads you're currently missing after hours.",
    },
    next_step:
      "Pick the single quick win above that solves your biggest headache, and spend 30 minutes on its action item before Friday.",
    _mock: true,
  };
}

// Stands in for GET /api/plan/:id in mock mode (e.g. opening a /plan/:id link in dev).
// The originating profile isn't known from the id alone, so we return a representative one.
export function mockSavedPlan(id) {
  const profile = {
    businessType: "your business",
    painPoints: ["Getting more customers / leads"],
    teamSize: "2–5 people",
    budget: "Under $100/mo",
    extraContext: "",
  };
  return { id, profile, plan: mockPlan(profile), createdAt: new Date().toISOString() };
}

export function mockChatReply(message) {
  return (
    `Great question. (This is placeholder output — the live AI advisor turns on once the ` +
    `backend Worker is wired up.) In the meantime: break "${message}" into the smallest first ` +
    `step you could finish in 30 minutes, and start there. Momentum matters more than picking ` +
    `the perfect tool.`
  );
}
