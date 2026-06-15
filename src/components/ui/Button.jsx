// Shared button. Variants cover the patterns repeated across the app; one-off buttons
// (e.g. tab triggers, the task status checkbox) stay inline with their component.

const VARIANTS = {
  // Big primary CTA (intake "Next", "Get My AI Plan", booking submit).
  primary:
    "px-9 py-3.5 text-base font-semibold tracking-wide bg-brand-ocean text-white " +
    "disabled:bg-brand-border disabled:text-brand-slate disabled:opacity-70 disabled:cursor-default",
  // Neutral outlined button (Start Over, Save Plan, secondary actions).
  outline:
    "px-5 py-2.5 text-[15px] font-medium bg-white text-brand-navy border-[1.5px] border-brand-border",
  // Coral accent (Book a Consultation).
  coral:
    "px-4 py-2 text-sm font-semibold bg-brand-coral text-white border-[1.5px] border-brand-coral",
  // Text-only back button.
  ghost: "px-4 py-2 text-[15px] font-medium bg-transparent text-brand-slate",
};

export function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[10px] font-[inherit] transition disabled:cursor-default ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
