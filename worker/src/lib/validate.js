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
  if (body.painPoints.length > 4) return "Too many pain points (max 4).";
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

// Maximum history turns (user+assistant pairs) sent per chat request.
export const MAX_CHAT_HISTORY = 20;

export function validateChat(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.planId !== "string" || !body.planId.trim())
    return "planId is required.";
  if (typeof body.message !== "string" || !body.message.trim())
    return "message is required.";
  if (body.message.length > 2000) return "message is too long.";
  if (body.history != null) {
    if (!Array.isArray(body.history)) return "history must be an array.";
    if (body.history.length > MAX_CHAT_HISTORY)
      return `history is too long (max ${MAX_CHAT_HISTORY} messages).`;
    for (const msg of body.history) {
      if (!msg || typeof msg !== "object") return "Invalid history entry.";
      if (typeof msg.content !== "string" || msg.content.length > 2000)
        return "A history message is too long.";
    }
  }
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

export function validateVerifyStart(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email))
    return "A valid email is required.";
  if (body.email.length > 254) return "Email is too long.";
  return null;
}

export function validateVerifyCheck(body) {
  if (!body || typeof body !== "object") return "Missing request body.";
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email))
    return "A valid email is required.";
  if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code.trim()))
    return "A 6-digit code is required.";
  return null;
}
