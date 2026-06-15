// Shared button matching the design's tokens. Variants cover the repeated patterns; one-off
// buttons (plan action bar, provider cards, booking) stay inline with their component.

const BASE =
  "inline-flex items-center justify-center gap-[9px] rounded-[12px] font-[inherit] transition disabled:cursor-not-allowed focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-brand-ocean/40";

const VARIANTS = {
  // Big primary CTA (intake Continue, retry, booking submit).
  primary:
    "bg-brand-ocean px-[26px] py-[14px] text-[16px] font-bold text-white hover:bg-brand-navy disabled:bg-[#bcd4e3] disabled:text-white",
  // Coral accent.
  coral: "bg-brand-coral px-[26px] py-[14px] text-[16px] font-bold text-white hover:bg-[#cf5946]",
  // Neutral outlined (intake Back, secondary actions).
  outline:
    "border border-brand-border bg-white px-[22px] py-[14px] text-[15px] font-semibold text-brand-slate hover:border-brand-ocean hover:text-brand-navy focus:outline-2 focus:outline-brand-ocean",
  // Text-only.
  ghost: "bg-transparent px-4 py-2 text-[15px] font-medium text-brand-slate",
};

export function Button({ variant = "primary", className = "", ...props }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
