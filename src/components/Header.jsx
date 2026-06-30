import { SITE } from "../config/site.js";

// The Visions logo mark from the design: ocean rounded square with a sun + two waves
// (the second wave in foam). Used in the app header.
export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#1A7FB5" />
      <circle cx="20" cy="15.5" r="5.6" fill="#FAF6F0" />
      <path
        d="M6.5 27.5 Q13 23 20 27.5 T33.5 27.5"
        stroke="#FAF6F0"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M6.5 32.5 Q13 28 20 32.5 T33.5 32.5"
        stroke="#6CC4A1"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Sticky, blurred app header: logo + wordmark + market badge, with an optional restart
// control (shown on intake/results, hidden on the landing). `restartLabel` overrides the
// default "Start over" text — useful on shared plan pages where "New Plan" is clearer.
export function Header({ onHome, restartLabel = "Start over" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-border bg-brand-sand/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-[22px] py-3">
        <div className="flex items-center gap-[11px]">
          <LogoMark />
          <span className="text-[19px] font-extrabold tracking-[-0.02em]">{SITE.brand}</span>
          <span className="rounded-md border border-[#cfe4f1] bg-brand-lightblue px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.12em] text-brand-ocean">
            {SITE.location.name}
          </span>
        </div>
        {onHome && (
          <button
            onClick={onHome}
            className="inline-flex items-center gap-[7px] rounded-[10px] border border-brand-border bg-white px-3.5 py-2 text-[13px] font-semibold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean"
          >
            ↺ {restartLabel}
          </button>
        )}
      </div>
    </header>
  );
}
