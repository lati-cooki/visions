import { TEAM_SIZES, BUDGETS } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { OptionButton } from "../ui/OptionButton.jsx";
import { Button } from "../ui/Button.jsx";

// Step 3: team size, budget, and optional free-text context. Submits to plan generation.
export function DetailsStep({
  teamSize,
  setTeamSize,
  budget,
  setBudget,
  extraContext,
  setExtraContext,
  canAdvance,
  onBack,
  onSubmit,
}) {
  return (
    <>
      <ProgressDots step={3} />
      <h2 className="mb-6 text-2xl font-bold">A couple more details</h2>

      <div className="mb-6">
        <p className="mb-2.5 text-[15px] font-semibold">Team size</p>
        <div className="grid grid-cols-2 gap-2">
          {TEAM_SIZES.map((t) => (
            <OptionButton key={t.id} active={teamSize === t.id} onClick={() => setTeamSize(t.id)}>
              {t.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2.5 text-[15px] font-semibold">Monthly budget for AI tools</p>
        <div className="grid grid-cols-2 gap-2">
          {BUDGETS.map((b) => (
            <OptionButton key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>
              {b.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-2.5 text-[15px] font-semibold">
          Anything else? <span className="font-normal text-brand-slate">(optional)</span>
        </p>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="E.g., I run a surf shop in PB and most of my customers find me on Instagram..."
          rows={3}
          className="box-border w-full resize-y rounded-[10px] border-[1.5px] border-brand-border px-4 py-3 text-[15px] leading-relaxed outline-none"
        />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canAdvance} onClick={onSubmit}>
          Get My AI Plan ✨
        </Button>
      </div>
    </>
  );
}
