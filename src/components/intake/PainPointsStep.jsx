import { PAIN_POINTS, MAX_PAIN_POINTS } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { Button } from "../ui/Button.jsx";

// Step 2: pick up to MAX_PAIN_POINTS pain points. Checkbox rows; unselected rows dim once the
// cap is hit.
export function PainPointsStep({ painPoints, togglePainPoint, canAdvance, onBack, onNext }) {
  const full = painPoints.length >= MAX_PAIN_POINTS;

  return (
    <div className="[animation:vfade_.4s_ease_both]">
      <ProgressDots step={2} />
      <h2 className="m-0 mb-[7px] text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.02em]">
        Where do you feel the squeeze?
      </h2>
      <p className="m-0 mb-5 text-[15px] text-brand-slate">
        Choose up to {MAX_PAIN_POINTS}.{" "}
        <span className="font-bold text-brand-ocean">{painPoints.length} selected</span>
      </p>

      <div className="flex flex-col gap-2.5">
        {PAIN_POINTS.map((p) => {
          const checked = painPoints.includes(p.id);
          const dim = full && !checked;
          return (
            <button
              key={p.id}
              onClick={() => !dim && togglePainPoint(p.id)}
              className={`flex w-full items-center gap-[13px] rounded-[12px] px-4 py-[14px] text-left text-[15px] font-semibold text-brand-navy transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean ${
                checked
                  ? "border-[1.5px] border-brand-ocean bg-brand-lightblue"
                  : "border border-brand-border bg-white"
              } ${dim ? "opacity-50" : ""}`}
            >
              <span
                className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-[13px] text-white ${
                  checked ? "border-[1.5px] border-brand-ocean bg-brand-ocean" : "border-[1.5px] border-[#cdd6dd] bg-white"
                }`}
              >
                {checked ? "✓" : ""}
              </span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-[34px] flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canAdvance} onClick={onNext}>
          Continue →
        </Button>
      </div>
    </div>
  );
}
