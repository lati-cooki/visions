import { useState } from "react";
import { SITE } from "../config/site.js";
import { saveBooking } from "../lib/api.js";
import { OptionButton } from "./ui/OptionButton.jsx";
import { Button } from "./ui/Button.jsx";

const TEXT_FIELDS = [
  { key: "name", label: "Name", placeholder: "Your full name", type: "text" },
  { key: "email", label: "Email", placeholder: "you@business.com", type: "email" },
  { key: "phone", label: "Phone", placeholder: "(619) 555-0123", type: "tel" },
];

// Consultation booking modal. Persists the request via POST /api/booking (the bookings
// table), then shows a confirmation. `planId` links the booking to the plan when present.
export function BookingModal({ planId, onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferred: "morning",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name || !form.email || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await saveBooking({ planId, ...form });
      setSubmitted(true);
    } catch {
      setSubmitError("Couldn't send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-brand-navy/60 p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-[460px] overflow-auto rounded-[18px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        {submitted ? (
          <div className="py-5 text-center">
            <div className="mb-4 text-4xl">✅</div>
            <h3 className="m-0 mb-2 text-xl font-bold">You're booked!</h3>
            <p className="text-[15px] leading-relaxed text-brand-slate">
              We'll reach out within 24 hours to confirm your consultation time. Check your email
              for details.
            </p>
            <Button className="mt-5 px-7 py-3" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="m-0 mb-1 text-xl font-bold">Book a Free Consultation</h3>
                <p className="m-0 text-sm text-brand-slate">
                  30 minutes with {SITE.consultation.advisorLabel}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-2xl leading-none text-brand-slate"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3.5">
              {TEXT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-[13px] font-semibold">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="box-border w-full rounded-[10px] border-[1.5px] border-brand-border px-3.5 py-2.5 text-sm outline-none"
                  />
                </div>
              ))}

              <div>
                <label className="mb-1 block text-[13px] font-semibold">Preferred time</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "morning", l: "Morning" },
                    { id: "afternoon", l: "Afternoon" },
                  ].map((t) => (
                    <OptionButton
                      key={t.id}
                      active={form.preferred === t.id}
                      onClick={() => update("preferred", t.id)}
                    >
                      {t.l}
                    </OptionButton>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold">
                  What do you need help with?{" "}
                  <span className="font-normal text-brand-slate">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="E.g., I want help setting up the AI chatbot from my plan..."
                  rows={3}
                  className="box-border w-full resize-y rounded-[10px] border-[1.5px] border-brand-border px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              {submitError && (
                <p className="m-0 text-[13px] text-brand-coral">{submitError}</p>
              )}
              <Button
                className="mt-2 w-full"
                disabled={!form.name || !form.email || submitting}
                onClick={submit}
              >
                {submitting ? "Sending..." : "Request Consultation →"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
