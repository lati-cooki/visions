// Assembles a clean business profile from raw intake state by resolving option ids to
// their human-readable labels. This is the shape sent to the backend for plan generation;
// the backend (Worker) builds the Anthropic prompt from it so prompt logic stays server-side.

import { BUSINESS_TYPES, PAIN_POINTS, TEAM_SIZES, BUDGETS } from "../data/intake.js";

const labelFor = (list, id) => list.find((item) => item.id === id)?.label || "";

export function buildProfile({
  businessType,
  otherType,
  painPoints,
  teamSize,
  budget,
  extraContext,
}) {
  return {
    businessType:
      businessType === "other"
        ? otherType.trim()
        : labelFor(BUSINESS_TYPES, businessType),
    painPoints: painPoints
      .map((id) => labelFor(PAIN_POINTS, id))
      .filter(Boolean),
    teamSize: labelFor(TEAM_SIZES, teamSize),
    budget: labelFor(BUDGETS, budget),
    extraContext: extraContext.trim(),
  };
}
