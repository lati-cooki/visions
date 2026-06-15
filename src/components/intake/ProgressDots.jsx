const STEP_TITLES = { 1: "Your business", 2: "Your challenges", 3: "Team & budget" };

// Intake progress: "Step N of 3 · Title" + three segmented bars that fill ocean as you go.
export function ProgressDots({ step }) {
  return (
    <div className="mb-[30px]">
      <div className="mb-[11px] text-[13px] font-bold text-brand-ocean">
        Step {step} of 3 · {STEP_TITLES[step]}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-[6px] flex-1 rounded-full transition-colors duration-300 ${
              step >= s ? "bg-brand-ocean" : "bg-brand-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
