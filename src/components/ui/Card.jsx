// Base surface: white panel, rounded-card, hairline border. `className` overrides defaults
// (e.g. gradient plan header, accent left border) since Tailwind keeps the last class.
export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`rounded-card border border-brand-border bg-white p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
