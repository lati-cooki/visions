import { useState } from "react";
import { saveBooking } from "../lib/api.js";
import { OptionButton } from "./ui/OptionButton.jsx";

const FIELDS = [
  { key: "name", label: "Name", required: true, type: "text", placeholder: "Your name" },
  { key: "email", label: "Email", required: true, type: "email", placeholder: "you@business.com" },
  { key: "phone", label: "Phone", required: false, type: "tel", placeholder: "(619) 555-0142" },
];

// Consultation booking modal. Persists via POST /api/booking (the bookings table), then shows
// a personalized confirmation. `planId` links the booking to the plan when present.
export function BookingModal({ planId, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", preferred: "morning", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const canSubmit = form.name.trim() && form.email.trim();

  const submit = async () => {
    if (!canSubmit || submitting) return;
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

  const fieldClass =
    "w-full rounded-[10px] border border-brand-border px-3.5 py-3 text-[15px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]";

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-navy/45 p-5 backdrop-blur-[5px]"
    >
      <div className="max-h-[92vh] w-full max-w-[480px] overflow-auto rounded-[18px] bg-white shadow-[0_30px_80px_-20px_rgba(15,43,60,0.55)] [animation:vpop_.26s_ease_both]">
        {submitted ? (
          <div className="px-[30px] pb-[34px] pt-10 text-center">
            <div className="mx-auto mb-5 flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[#c2e6d6] bg-[#e9f6f0] text-[30px] text-[#2f8f6b]">
              ✓
            </div>
            <h2 className="m-0 mb-2.5 text-[22px] font-extrabold tracking-[-0.02em]">
              You're all set, {form.name.trim() || "there"}!
            </h2>
            <p className="m-0 mb-[26px] text-[15px] leading-[1.55] text-brand-slate">
              We'll email <strong className="text-brand-navy">{form.email.trim() || "your inbox"}</strong> within
              one business day to lock in your {form.preferred} consultation.
            </p>
            <button
              onClick={onClose}
              className="rounded-[12px] bg-brand-ocean px-[26px] py-[13px] text-[15px] font-bold text-white transition hover:bg-brand-navy"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-[26px] pb-7 pt-[26px]">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">Book a free consultation</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[20px] text-brand-slate transition hover:bg-[#f3eee6]"
              >
                ×
              </button>
            </div>
            <p className="m-0 mb-[22px] text-[14px] leading-[1.5] text-brand-slate">
              A local Visions expert will reach out to confirm. No charge, no obligation.
            </p>

            <div className="flex flex-col gap-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`bk-${f.key}`} className="mb-[7px] block text-[13px] font-bold">
                    {f.label}{" "}
                    {f.required ? (
                      <span className="text-brand-coral">*</span>
                    ) : (
                      <span className="font-medium text-[#9aa7b1]">(optional)</span>
                    )}
                  </label>
                  <input
                    id={`bk-${f.key}`}
                    type={f.type}
                    value={form[f.key]}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={fieldClass}
                  />
                </div>
              ))}

              <div>
                <span className="mb-[9px] block text-[13px] font-bold">Preferred time</span>
                <div className="flex gap-2.5">
                  <OptionButton active={form.preferred === "morning"} onClick={() => update("preferred", "morning")}>
                    ☀ Morning
                  </OptionButton>
                  <OptionButton active={form.preferred === "afternoon"} onClick={() => update("preferred", "afternoon")}>
                    ⛅ Afternoon
                  </OptionButton>
                </div>
              </div>

              <div>
                <label htmlFor="bk-msg" className="mb-[7px] block text-[13px] font-bold">
                  Message <span className="font-medium text-[#9aa7b1]">(optional)</span>
                </label>
                <textarea
                  id="bk-msg"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="What would you like help with?"
                  rows={2}
                  className={`${fieldClass} resize-y`}
                />
              </div>

              {submitError && <p className="m-0 text-[13px] text-brand-coral">{submitError}</p>}

              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="mt-1 w-full rounded-[12px] bg-brand-ocean px-[26px] py-[14px] text-[16px] font-bold text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:bg-[#bcd4e3]"
              >
                {submitting ? "Sending..." : "Book my consultation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
