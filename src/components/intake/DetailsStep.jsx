import { TEAM_SIZES, BUDGETS } from "../../data/intake.js";
import { ProgressDots } from "./ProgressDots.jsx";
import { OptionButton } from "../ui/OptionButton.jsx";
import { Button } from "../ui/Button.jsx";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile.jsx";

// Step 3: team size + budget chips + optional notes. Submits to plan generation.
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
  turnstileToken,
  setTurnstileToken,
}) {
  // Require a Turnstile token before submit only when the widget is configured.
  const needsToken = Boolean(TURNSTILE_SITE_KEY);
  const canSubmit = canAdvance && (!needsToken || Boolean(turnstileToken));
  return (
    <div className="[animation:vfade_.4s_ease_both]">
      <ProgressDots step={3} />
      <h2 className="m-0 mb-[7px] text-[clamp(24px,4vw,30px)] font-extrabold tracking-[-0.02em]">
        Last bit — your team &amp; budget
      </h2>
      <p className="m-0 mb-[26px] text-[15px] text-brand-slate">
        So the plan fits what you can actually take on.
      </p>

      <div className="mb-[26px]">
        <div className="mb-3 text-[14px] font-bold">Team size</div>
        <div className="flex flex-wrap gap-2.5">
          {TEAM_SIZES.map((t) => (
            <OptionButton key={t.id} active={teamSize === t.id} onClick={() => setTeamSize(t.id)}>
              {t.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="mb-[26px]">
        <div className="mb-3 text-[14px] font-bold">Monthly budget for tools</div>
        <div className="flex flex-wrap gap-2.5">
          {BUDGETS.map((b) => (
            <OptionButton key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>
              {b.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="v-notes" className="mb-2.5 block text-[14px] font-bold">
          Anything else? <span className="font-medium text-[#9aa7b1]">(optional)</span>
        </label>
        <textarea
          id="v-notes"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="e.g. We're busiest on weekends and miss a lot of calls…"
          rows={3}
          className="w-full resize-y rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[15px] leading-relaxed outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
        />
      </div>

      <Turnstile onVerify={setTurnstileToken} />

      <div className="mt-[34px] flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button disabled={!canSubmit} onClick={onSubmit}>
          See my plan →
        </Button>
      </div>
    </div>
  );
}
