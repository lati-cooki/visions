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
    eyebrow: "San Diego",
    headlineLead: "Small Business",
    headlineEmphasis: "AI Advisor",
    subhead:
      "Answer a few quick questions about your business. Get a personalized AI toolkit, actionable tasks, and connect with local experts who can help you implement.",
    cta: "Get My Free AI Plan",
    fineprint: "60 seconds · No signup · Powered by Claude",
    // Aspirational marketing copy, not measured data (see CLAUDE.md "Key Constraints").
    stats: [
      { n: "500+", l: "SD businesses helped" },
      { n: "4 min", l: "avg. time to first win" },
      { n: "Free", l: "always" },
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
