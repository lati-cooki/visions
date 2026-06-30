// Central site configuration.
//
// Brand- and location-level copy lives here so Visions can be re-skinned — renamed,
// pointed at a new city, or extended to a new vertical — without editing components.
// Today the flagship market is San Diego; keep "San Diego" out of components and read
// it from here instead.

export const SITE = {
  brand: "Visions",
  tagline: "Small Business AI Advisor",
  emoji: "🏄",

  // The flagship market. Add more markets later by lifting this into a list/lookup.
  location: {
    name: "San Diego",
    short: "SD",
    // Local color the AI plan prompt can lean on (passed to the backend later).
    flavor:
      "tourism seasons, border trade, the military community, and beach/surf culture",
  },

  landing: {
    eyebrowSuffix: "Small Business",
    subhead:
      "Answer three quick questions and get a personalized plan to put AI to work in your business — in plain English, ready to start this week.",
    cta: "Get My Free AI Plan",
    fineprint: "60 seconds · Email verification · Powered by Claude",
    // Aspirational marketing copy, not measured data (see CLAUDE.md "Key Constraints").
    // `accent` is the colored suffix (brand color key) appended after `value`.
    stats: [
      { value: "2,400", accent: "+", accentColor: "ocean", label: "SD businesses planned" },
      { value: "11", accent: " hrs", accentColor: "slate", label: "saved per week, avg" },
      { value: "4.9", accent: "★", accentColor: "coral", label: "owner rating" },
    ],
  },

  consultation: {
    // Shown in the booking modal subhead.
    advisorLabel: "a San Diego AI advisor",
  },

  directory: {
    heading: "San Diego AI Service Providers",
    subhead: "Local experts who can help you implement your AI plan.",
    getListedPrompt: "Are you a San Diego AI service provider?",
  },
};
