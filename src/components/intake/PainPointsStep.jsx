import { PAIN_POINTS, MAX_PAIN_POINTS } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { OptionButton } from "../ui/OptionButton.jsx";
import { Button } from "../ui/Button.jsx";

// Step 2: pick up to MAX_PAIN_POINTS pain points. Unselected options dim once the cap is hit.
export function PainPointsStep({
  painPoints,
  togglePainPoint,
  canAdvance,
  onBack,
  onNext,
}) {
  return (
    <>
      <ProgressDots step={2} />
      <h2 className="mb-1.5 text-2xl font-bold">Where does it hurt?</h2>
      <p className="mb-6 text-[15px] text-brand-slate">
        Pick up to {MAX_PAIN_POINTS} pain points you'd most like AI to help with.
      </p>

      <div className="flex flex-col gap-2">
        {PAIN_POINTS.map((p) => {
          const active = painPoints.includes(p.id);
          const disabled = !active && painPoints.length >= MAX_PAIN_POINTS;
          return (
            <OptionButton
              key={p.id}
              active={active}
              disabled={disabled}
              onClick={() => !disabled && togglePainPoint(p.id)}
            >
              <span className="mr-2 text-[13px]">{active ? "✔" : "○"}</span>
              {p.label}
            </OptionButton>
          );
        })}
      </div>

      <div className="mt-7 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canAdvance} onClick={onNext}>
          Next →
        </Button>
      </div>
    </>
  );
}
