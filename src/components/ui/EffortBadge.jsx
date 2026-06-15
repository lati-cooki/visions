// Maps a quick-win `effort` level to its UI badge. The label mapping is fixed by the
// prompt contract in CLAUDE.md: easy → Quick Start, medium → Some Setup, advanced → Deeper Build.
const EFFORT = {
  easy: { className: "bg-emerald-100 text-emerald-800", label: "Quick Start" },
  medium: { className: "bg-amber-100 text-amber-800", label: "Some Setup" },
  advanced: { className: "bg-blue-100 text-blue-800", label: "Deeper Build" },
};

export function EffortBadge({ effort }) {
  const e = EFFORT[effort] || EFFORT.easy;
  return (
    <span
      className={`inline-block rounded-[20px] px-2.5 py-0.5 text-xs font-semibold ${e.className}`}
    >
      {e.label}
    </span>
  );
}
