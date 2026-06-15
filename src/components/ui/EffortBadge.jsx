// Maps a quick-win `effort` level to its UI badge, using the design's coastal palette.
// Label mapping is fixed by the prompt contract: easy → Quick Start, medium → Some Setup,
// advanced → Deeper Build.
const EFFORT = {
  easy: { className: "bg-[#e9f6f0] text-[#2f8f6b] border-[#c2e6d6]", label: "Quick Start" },
  medium: { className: "bg-brand-lightblue text-brand-ocean border-[#cfe4f1]", label: "Some Setup" },
  advanced: { className: "bg-[#fdeee9] text-[#c1543f] border-[#f3d6cd]", label: "Deeper Build" },
};

export function EffortBadge({ effort, className = "" }) {
  const e = EFFORT[effort] || EFFORT.easy;
  return (
    <span
      className={`inline-block self-start rounded-[7px] border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.05em] ${e.className} ${className}`}
    >
      {e.label}
    </span>
  );
}
