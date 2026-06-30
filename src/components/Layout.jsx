import { Header } from "./Header.jsx";

// Content column widths from the design: landing/results are wide (1120px), intake is
// narrow (760px).
const WIDTHS = { wide: "max-w-[1120px]", narrow: "max-w-[760px]" };

// App-wide page shell: vertical coastal gradient + sticky header + centered content column.
// Pass `onHome` to show the header's restart control (omitted on the landing).
// `restartLabel` overrides the button text (default "Start over").
export function PageShell({ width = "wide", onHome = null, restartLabel, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-sand via-white to-brand-lightblue font-sans text-brand-navy">
      <Header onHome={onHome} restartLabel={restartLabel} />
      <main className={`mx-auto ${WIDTHS[width]} px-[22px] pb-20 pt-[clamp(26px,5vw,52px)]`}>
        {children}
      </main>
    </div>
  );
}
