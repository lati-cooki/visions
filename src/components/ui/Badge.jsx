// Small rounded pill. Pass Tailwind color classes via `className` (e.g. status colors,
// effort levels). Defaults to the light-blue/ocean "tool tag" look.
export function Badge({ className = "bg-brand-lightblue text-brand-ocean", children }) {
  return (
    <span
      className={`inline-block rounded-[10px] px-2 py-px text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}
