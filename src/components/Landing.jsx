import { SITE } from "../config/site.js";
import { PageShell } from "./Layout.jsx";
import { Button } from "./ui/Button.jsx";

// Step 0: hero landing. All copy comes from SITE config so the brand/market can change
// without touching this component.
export function Landing({ onStart }) {
  const { brand, tagline, emoji, landing } = SITE;

  return (
    <PageShell center>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-ocean to-brand-foam text-3xl shadow-[0_4px_16px_rgba(26,127,181,0.25)]">
        {emoji}
      </div>

      <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[2.5px] text-brand-ocean">
        {landing.eyebrow}
      </div>

      <h1 className="m-0 mb-3.5 max-w-[500px] text-[38px] font-bold leading-[1.1]">
        {brand}
        <br />
        <span className="text-brand-ocean">{tagline}</span>
      </h1>

      <p className="m-0 mb-9 max-w-[440px] text-[17px] leading-[1.65] text-brand-slate">
        {landing.subhead}
      </p>

      <Button className="px-10 py-4 text-[17px]" onClick={onStart}>
        {landing.cta} →
      </Button>

      <p className="mt-4 text-[13px] text-brand-slate opacity-65">{landing.fineprint}</p>

      <div className="mt-12 flex gap-6">
        {landing.stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-[22px] font-bold text-brand-ocean">{s.n}</div>
            <div className="mt-0.5 text-xs text-brand-slate">{s.l}</div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
