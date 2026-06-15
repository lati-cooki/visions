// Intake question options. These drive the 3-step intake flow and are referenced by
// label lookups when assembling the business profile sent for plan generation.

export const BUSINESS_TYPES = [
  { id: "restaurant", label: "Restaurant / Food & Bev", icon: "🍽️" },
  { id: "retail", label: "Retail / E-Commerce", icon: "🛍️" },
  { id: "services", label: "Professional Services", icon: "💼" },
  { id: "health", label: "Health & Wellness", icon: "🩺" },
  { id: "construction", label: "Construction / Trades", icon: "🔨" },
  { id: "creative", label: "Creative / Marketing", icon: "🎨" },
  { id: "realestate", label: "Real Estate", icon: "🏠" },
  { id: "other", label: "Other", icon: "⚡" },
];

export const PAIN_POINTS = [
  { id: "leads", label: "Getting more customers / leads" },
  { id: "time", label: "Too many manual tasks eating my time" },
  { id: "social", label: "Keeping up with social media & marketing" },
  { id: "support", label: "Handling customer questions & support" },
  { id: "scheduling", label: "Scheduling, bookings & appointments" },
  { id: "inventory", label: "Inventory, ordering & supply chain" },
  { id: "bookkeeping", label: "Bookkeeping, invoicing & payments" },
  { id: "hiring", label: "Hiring & managing my team" },
  { id: "data", label: "Understanding my business data & trends" },
  { id: "content", label: "Creating content (photos, copy, video)" },
];

export const TEAM_SIZES = [
  { id: "solo", label: "Just me" },
  { id: "small", label: "2–5 people" },
  { id: "medium", label: "6–20 people" },
  { id: "larger", label: "20+" },
];

export const BUDGETS = [
  { id: "free", label: "Free tools only" },
  { id: "low", label: "Under $100/mo" },
  { id: "mid", label: "$100–500/mo" },
  { id: "high", label: "$500+/mo" },
];

// Max pain points a user may select in step 2.
export const MAX_PAIN_POINTS = 4;
