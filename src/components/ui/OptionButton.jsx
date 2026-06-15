// Chip-style choice button used for team size, budget, and the booking time picker. Active
// gets an ocean ring + light-blue fill (the design's `chipSel`).
export function OptionButton({ active, disabled = false, className = "", children, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[11px] px-[18px] py-[11px] text-[14px] font-semibold font-[inherit] transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean ${
        active
          ? "border-[1.5px] border-brand-ocean bg-brand-lightblue text-brand-navy"
          : "border border-brand-border bg-white text-brand-slate"
      } ${disabled ? "cursor-default opacity-45" : "cursor-pointer hover:border-brand-ocean"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
