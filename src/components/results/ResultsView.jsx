import { PageShell } from "../Layout.jsx";
import { Button } from "../ui/Button.jsx";
import { PlanView } from "./PlanView.jsx";
import { ProviderDirectory } from "./ProviderDirectory.jsx";
import { BookingModal } from "../BookingModal.jsx";

const TABS = [
  { id: "plan", label: "AI Plan" },
  { id: "experts", label: "Experts" },
];

// Results surface: loading/error states + tabbed plan/experts views. Data + handlers
// are passed in; "Start over" lives in the shared header (onRestart).
export function ResultsView({
  loading,
  error,
  onRetry,
  recommendations,
  profile,
  businessLabel,
  onRestart,
  activeTab,
  setActiveTab,
  onSavePlan,
  planSaved,
  shareUrl,
  planId,
  showBooking,
  setShowBooking,
}) {
  if (loading) {
    return (
      <PageShell width="wide" onHome={onRestart}>
        <div className="pt-24 text-center">
          <div className="mb-5 animate-pulse text-[44px]">🤖</div>
          <h2 className="mb-2 text-[22px] font-semibold">Building your AI plan...</h2>
          <p className="text-[15px] text-brand-slate">
            Analyzing your business and matching you with the right tools.
          </p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell width="wide" onHome={onRestart}>
        <div className="pt-20 text-center">
          <p className="mb-5 text-base text-brand-coral">{error}</p>
          <Button onClick={onRetry}>Try Again</Button>
        </div>
      </PageShell>
    );
  }

  if (!recommendations) return null;

  return (
    <PageShell width="wide" onHome={onRestart}>
      <div className="mb-7 flex gap-1 overflow-x-auto border-b border-brand-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-[2.5px] px-[22px] py-[13px] text-[15px] font-semibold transition focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-brand-ocean ${
              activeTab === t.id
                ? "border-brand-ocean text-brand-navy"
                : "border-transparent text-brand-slate hover:text-brand-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "plan" && (
        <PlanView
          recommendations={recommendations}
          profile={profile}
          businessLabel={businessLabel}
          onSavePlan={onSavePlan}
          onBook={() => setShowBooking(true)}
          planSaved={planSaved}
          shareUrl={shareUrl}
        />
      )}

      {activeTab === "experts" && <ProviderDirectory onContact={() => setShowBooking(true)} />}

      {showBooking && <BookingModal planId={planId} onClose={() => setShowBooking(false)} />}
    </PageShell>
  );
}
