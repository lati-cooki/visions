// Selectable choice button used across the intake steps and the booking time picker.
// Active state gets an ocean ring + light-blue fill; disabled dims and blocks clicks.
export function OptionButton({ active, disabled = false, className = "", children, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`rounded-[10px] px-5 py-2.5 text-left text-[15px] font-[inherit] leading-snug text-brand-navy transition ${
        active
          ? "border-2 border-brand-ocean bg-brand-lightblue font-semibold"
          : "border-[1.5px] border-brand-border bg-white font-normal"
      } ${disabled ? "cursor-default opacity-45" : "cursor-pointer"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
