// Input validation + normalization. Pure functions (no runtime deps) so they're unit-tested
// directly. Each validator returns an error string, or null when the input is acceptable.
// We validate shape/length/type to reject abuse and bad data — not exact enum membership,
// since the labels originate from our own client and may evolve.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateProfile(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.businessType !== "string" || !body.businessType.trim())
    return "businessType is required.";
  if (body.businessType.length > 200) return "businessType is too long.";
  if (!Array.isArray(body.painPoints) || body.painPoints.length === 0)
    return "At least one pain point is required.";
  if (body.painPoints.length > 10) return "Too many pain points.";
  if (!body.painPoints.every((p) => typeof p === "string" && p.length <= 200))
    return "Invalid pain point.";
  if (
    body.extraContext != null &&
    (typeof body.extraContext !== "string" || body.extraContext.length > 2000)
  )
    return "extraContext is too long.";
  return null;
}

// Clean profile shape used for prompting and persistence.
export function normalizeProfile(body) {
  return {
    businessType: body.businessType.trim(),
    painPoints: body.painPoints.map((p) => p.trim()).filter(Boolean),
    teamSize: typeof body.teamSize === "string" ? body.teamSize.trim() : "",
    budget: typeof body.budget === "string" ? body.budget.trim() : "",
    extraContext: typeof body.extraContext === "string" ? body.extraContext.trim() : "",
  };
}

export function validateChat(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.message !== "string" || !body.message.trim())
    return "message is required.";
  if (body.message.length > 2000) return "message is too long.";
  if (body.history != null && !Array.isArray(body.history))
    return "history must be an array.";
  return null;
}

export function validateBooking(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.name !== "string" || !body.name.trim()) return "Name is required.";
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email))
    return "A valid email is required.";
  if (
    body.message != null &&
    (typeof body.message !== "string" || body.message.length > 2000)
  )
    return "Message is too long.";
  return null;
}
