import { PageShell } from "../Layout.jsx";
import { Button } from "../ui/Button.jsx";
import { PlanView } from "./PlanView.jsx";
import { TaskBoard } from "./TaskBoard.jsx";
import { ProviderDirectory } from "./ProviderDirectory.jsx";
import { BookingModal } from "../BookingModal.jsx";

// Step 4 / shared-plan surface: owns the loading/error states and the tabbed
// plan/tasks/directory views. All data + handlers are passed in; this is layout + routing.
export function ResultsView({
  loading,
  error,
  onRetry,
  recommendations,
  profile,
  businessLabel,
  onRestart,
  restartLabel = "Start Over",
  activeTab,
  setActiveTab,
  tasks,
  setTasks,
  onAddTasks,
  onSavePlan,
  planSaved,
  shareUrl,
  planId,
  showBooking,
  setShowBooking,
}) {
  if (loading) {
    return (
      <PageShell>
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
      <PageShell>
        <div className="pt-20 text-center">
          <p className="mb-5 text-base text-brand-coral">{error}</p>
          <Button onClick={onRetry}>Try Again</Button>
        </div>
      </PageShell>
    );
  }

  if (!recommendations) return null;

  const tabs = [
    { id: "plan", label: "AI Plan" },
    { id: "tasks", label: `Tasks${tasks.length ? ` (${tasks.length})` : ""}` },
    { id: "directory", label: "SD Experts" },
  ];

  return (
    <PageShell>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-brand-ocean">
            Your AI Plan
          </div>
          <h2 className="m-0 mt-1 text-[22px] font-bold">{businessLabel}</h2>
        </div>
        <Button variant="outline" className="border px-3.5 py-1.5 text-[13px]" onClick={onRestart}>
          {restartLabel}
        </Button>
      </div>

      <div className="mb-6 mt-4 flex border-b-2 border-brand-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`-mb-0.5 border-b-[3px] px-5 py-2.5 text-sm transition ${
              activeTab === t.id
                ? "border-brand-ocean font-bold text-brand-ocean"
                : "border-transparent font-medium text-brand-slate"
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
          onAddTasks={onAddTasks}
          onSavePlan={onSavePlan}
          onBook={() => setShowBooking(true)}
          planSaved={planSaved}
          shareUrl={shareUrl}
        />
      )}

      {activeTab === "tasks" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="m-0 text-lg font-bold">Your AI Implementation Tasks</h3>
              <p className="m-0 mt-1 text-[13px] text-brand-slate">
                Track your progress as you adopt AI tools.
              </p>
            </div>
            {recommendations.quick_wins && (
              <button
                onClick={onAddTasks}
                className="rounded-lg border border-brand-ocean/30 px-3 py-1.5 text-xs text-brand-ocean"
              >
                + From Plan
              </button>
            )}
          </div>
          <TaskBoard tasks={tasks} setTasks={setTasks} />
        </>
      )}

      {activeTab === "directory" && (
        <ProviderDirectory onGetListed={() => setShowBooking(true)} />
      )}

      {showBooking && (
        <BookingModal planId={planId} onClose={() => setShowBooking(false)} />
      )}
    </PageShell>
  );
}
