import { SITE } from "../config/site.js";
import { PageShell } from "./Layout.jsx";

const ACCENT = {
  ocean: "text-brand-ocean",
  slate: "text-brand-slate",
  coral: "text-brand-coral",
};

// Step 0: two-column hero (left: pitch + CTA + stat tiles, right: a sample "plan preview"
// card) on the design's warm-coastal gradient. Copy comes from SITE config.
export function Landing({ onStart }) {
  const { brand, location, landing } = SITE;

  return (
    <PageShell width="wide">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(28px,5vw,56px)]">
        {/* Left: pitch */}
        <div className="[animation:vfade_.5s_ease_both]">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-ocean">
            <span className="h-[7px] w-[7px] rounded-full bg-brand-coral" />
            {location.name} · {landing.eyebrowSuffix}
          </div>

          <h1 className="m-0 mb-5 text-[clamp(34px,6vw,56px)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            {brand} <span className="text-brand-ocean">—</span>
            <br />
            Small Business <span className="text-brand-ocean">AI Advisor</span>
          </h1>

          <p className="m-0 mb-[30px] max-w-[31em] text-[clamp(16px,2vw,19px)] leading-[1.55] text-brand-slate">
            {landing.subhead}
          </p>

          <div className="flex flex-col items-start gap-3.5">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-[11px] rounded-[14px] bg-brand-ocean px-[30px] py-[17px] text-[17px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(26,127,181,0.65)] transition hover:bg-brand-navy hover:shadow-[0_12px_28px_-8px_rgba(15,43,60,0.5)] focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-brand-ocean/40"
            >
              {landing.cta} <span className="text-[18px]">→</span>
            </button>
            <div className="text-[13px] font-medium text-[#6b7a88]">{landing.fineprint}</div>
          </div>

          <div className="mt-10 grid max-w-[500px] grid-cols-3 gap-3">
            {landing.stats.map((s, i) => (
              <div key={i} className="rounded-[14px] border border-brand-border bg-white px-[15px] py-[17px]">
                <div className="text-[clamp(20px,3.4vw,27px)] font-extrabold tracking-[-0.02em]">
                  {s.value}
                  <span className={ACCENT[s.accentColor] || "text-brand-ocean"}>{s.accent}</span>
                </div>
                <div className="mt-1 text-xs font-medium leading-[1.3] text-brand-slate">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: sample plan preview */}
        <div className="relative [animation:vfade_.6s_.1s_ease_both]">
          <div className="absolute right-3.5 top-[-14px] z-[2] flex items-center gap-[7px] rounded-full border border-brand-border bg-white px-[13px] py-[7px] text-xs font-bold text-brand-navy shadow-[0_8px_20px_-8px_rgba(15,43,60,0.3)]">
            <span className="h-[7px] w-[7px] rounded-full bg-brand-foam" />
            Powered by Claude
          </div>
          <div className="rounded-[18px] border border-brand-border bg-white p-[22px] shadow-[0_30px_60px_-28px_rgba(15,43,60,0.32)]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#9aa7b1]">Your AI Plan</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#2f8f6b]">
                <span className="h-[7px] w-[7px] rounded-full bg-brand-foam" />
                Ready
              </span>
            </div>
            <div className="mb-3.5 rounded-[14px] bg-gradient-to-br from-brand-navy to-[#1A4A63] p-[18px] text-white">
              <div className="mb-[7px] text-[11px] font-bold uppercase tracking-[0.08em] text-[#7fc2e4]">Headline</div>
              <div className="text-[20px] font-extrabold leading-[1.2] tracking-[-0.01em]">
                Save ~11 hours a week with 4 quick wins.
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-[11px] rounded-[11px] border border-brand-border p-3">
                <span className="whitespace-nowrap rounded-md bg-[#e9f6f0] px-2 py-[3px] text-[11px] font-bold text-[#2f8f6b]">Quick Start</span>
                <span className="text-[13px] font-semibold">After-hours AI receptionist</span>
              </div>
              <div className="flex items-center gap-[11px] rounded-[11px] border border-brand-border p-3">
                <span className="whitespace-nowrap rounded-md bg-brand-lightblue px-2 py-[3px] text-[11px] font-bold text-brand-ocean">Some Setup</span>
                <span className="text-[13px] font-semibold">Auto-reply to reviews</span>
              </div>
            </div>
            <div className="mt-[13px] text-center text-xs font-semibold text-[#9aa7b1]">+ 2 more quick wins inside</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
