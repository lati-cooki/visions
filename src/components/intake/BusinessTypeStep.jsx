import { BUSINESS_TYPES } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { Button } from "../ui/Button.jsx";

// Line-art icons (ocean stroke) keyed by our business-type ids — replaces the prototype's
// emoji. fill=none, stroke=brand-ocean, width 1.8, rounded caps (the design's vocabulary).
const I = (paths) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A7FB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);
const ICONS = {
  restaurant: I(<><path d="M4 3v7a2 2 0 0 0 2 2v9" /><path d="M8 3v7a2 2 0 0 1-2 2" /><path d="M6 3v8" /><path d="M18 3c-1.7 0-3 2-3 4.5s1 4.5 3 4.5v9" /></>),
  retail: I(<><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></>),
  services: I(<><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" /></>),
  health: I(<path d="M12 20s-7-4.3-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.7 12 20 12 20z" />),
  construction: I(<path d="M14.5 5.5a4 4 0 0 0-5.3 5.3L4 16l4 4 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.7 2.7-2.3-.4-.4-2.3 2.6-2.7z" />),
  creative: I(<path d="M12 4l1.6 6.4L20 12l-6.4 1.6L12 20l-1.6-6.4L4 12l6.4-1.6z" />),
  realestate: I(<><path d="M3 11l9-7 9 7" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></>),
  other: I(<path d="M12 3l2.2 5.3L20 9l-4 3.8L17 19l-5-3-5 3 1-6.2L4 9l5.8-.7z" />),
};

// Step 1: pick a business type from an icon grid. "Other" reveals a free-text input.
export function BusinessTypeStep({
  businessType,
  setBusinessType,
  otherType,
  setOtherType,
  canAdvance,
  onNext,
}) {
  return (
    <div className="[animation:vfade_.4s_ease_both]">
      <ProgressDots step={1} />
      <h2 className="m-0 mb-[7px] text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.02em]">
        What kind of business do you run?
      </h2>
      <p className="m-0 mb-6 text-[15px] text-brand-slate">
        Pick the closest match — it tailors every recommendation.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {BUSINESS_TYPES.map((b) => {
          const active = businessType === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setBusinessType(b.id)}
              className={`relative flex w-full flex-col items-start gap-3 rounded-[14px] p-4 text-left font-[inherit] transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean ${
                active
                  ? "border-[1.5px] border-brand-ocean bg-brand-lightblue shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
                  : "border border-brand-border bg-white hover:border-brand-ocean"
              }`}
            >
              {ICONS[b.id] || ICONS.other}
              <span className="text-[14px] font-semibold">{b.label}</span>
              {active && (
                <span className="absolute right-[11px] top-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-brand-ocean text-[12px] text-white">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {businessType === "other" && (
        <input
          type="text"
          placeholder="Describe your business..."
          value={otherType}
          onChange={(e) => setOtherType(e.target.value)}
          className="mt-3 w-full rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[15px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
        />
      )}

      <div className="mt-[34px] flex justify-end">
        <Button disabled={!canAdvance} onClick={onNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
