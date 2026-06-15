import { BUSINESS_TYPES } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { OptionButton } from "../ui/OptionButton.jsx";
import { Button } from "../ui/Button.jsx";

// Step 1: pick a business type. "Other" reveals a free-text input.
export function BusinessTypeStep({
  businessType,
  setBusinessType,
  otherType,
  setOtherType,
  canAdvance,
  onNext,
}) {
  return (
    <>
      <ProgressDots step={1} />
      <h2 className="mb-1.5 text-2xl font-bold">What kind of business do you run?</h2>
      <p className="mb-6 text-[15px] text-brand-slate">Pick the closest match.</p>

      <div className="grid grid-cols-2 gap-2.5">
        {BUSINESS_TYPES.map((b) => (
          <OptionButton
            key={b.id}
            active={businessType === b.id}
            onClick={() => setBusinessType(b.id)}
          >
            <span className="mr-2">{b.icon}</span>
            {b.label}
          </OptionButton>
        ))}
      </div>

      {businessType === "other" && (
        <input
          type="text"
          placeholder="Describe your business..."
          value={otherType}
          onChange={(e) => setOtherType(e.target.value)}
          className="mt-3 box-border w-full rounded-[10px] border-[1.5px] border-brand-border px-4 py-3 text-[15px] outline-none"
        />
      )}

      <div className="mt-7 flex justify-end">
        <Button disabled={!canAdvance} onClick={onNext}>
          Next →
        </Button>
      </div>
    </>
  );
}
