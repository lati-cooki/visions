import { useEffect, useState } from "react";
import { MAX_PAIN_POINTS } from "./data/intake.js";
import { storage } from "./lib/storage.js";
import { buildProfile } from "./lib/profile.js";
import { generatePlan } from "./lib/api.js";
import { Landing } from "./components/Landing.jsx";
import { PageShell } from "./components/Layout.jsx";
import { BusinessTypeStep } from "./components/intake/BusinessTypeStep.jsx";
import { PainPointsStep } from "./components/intake/PainPointsStep.jsx";
import { DetailsStep } from "./components/intake/DetailsStep.jsx";
import { ResultsView } from "./components/results/ResultsView.jsx";

const TASKS_KEY = "tasks";
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Top-level orchestrator: owns the intake → plan → results state machine and wires data
// and handlers into the step/results components. Rendering is delegated; state lives here.
export default function App() {
  // Intake
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState(null);
  const [otherType, setOtherType] = useState("");
  const [painPoints, setPainPoints] = useState([]);
  const [teamSize, setTeamSize] = useState(null);
  const [budget, setBudget] = useState(null);
  const [extraContext, setExtraContext] = useState("");

  // Plan
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null); // snapshot used by results + chat

  // Results
  const [activeTab, setActiveTab] = useState("plan");
  const [tasks, setTasks] = useState([]);
  const [planSaved, setPlanSaved] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [showBooking, setShowBooking] = useState(false);

  // Load any previously saved tasks once on mount.
  useEffect(() => {
    (async () => {
      const res = await storage.get(TASKS_KEY);
      if (res?.value) {
        try {
          setTasks(JSON.parse(res.value));
        } catch {
          /* ignore corrupt cache */
        }
      }
    })();
  }, []);

  const togglePainPoint = (id) =>
    setPainPoints((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PAIN_POINTS) return prev;
      return [...prev, id];
    });

  const canAdvanceStep1 = businessType !== null && (businessType !== "other" || otherType.trim());
  const canAdvanceStep2 = painPoints.length >= 1;
  const canAdvanceStep3 = teamSize !== null && budget !== null;

  const getRecommendations = async () => {
    const snapshot = buildProfile({
      businessType,
      otherType,
      painPoints,
      teamSize,
      budget,
      extraContext,
    });
    setProfile(snapshot);
    setLoading(true);
    setError(null);
    setStep(4);
    setActiveTab("plan");

    try {
      const plan = await generatePlan(snapshot);
      if (!plan?.headline || !plan?.quick_wins) throw new Error("Incomplete response");
      setRecommendations(plan);
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Something went wrong generating your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    const id = newId();
    const planData = { id, profile, recommendations, createdAt: new Date().toISOString() };
    const ok = await storage.set(`plan:${id}`, JSON.stringify(planData));
    if (ok) {
      setShareId(id);
      setPlanSaved(true);
    }
  };

  const addTasksFromPlan = () => {
    if (!recommendations?.quick_wins) return;

    const fromWins = recommendations.quick_wins
      .filter((w) => w.task)
      .map((w) => ({
        id: newId(),
        title: w.task,
        status: "todo",
        source: "ai",
        createdAt: new Date().toISOString(),
        notes: w.title,
      }));

    const newTasks = recommendations.next_step
      ? [
          {
            id: newId(),
            title: recommendations.next_step,
            status: "todo",
            source: "ai",
            createdAt: new Date().toISOString(),
            notes: "This Week Priority",
          },
          ...fromWins,
        ]
      : fromWins;

    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    storage.set(TASKS_KEY, JSON.stringify(updated));
    setActiveTab("tasks");
  };

  const restart = () => {
    setStep(0);
    setBusinessType(null);
    setOtherType("");
    setPainPoints([]);
    setTeamSize(null);
    setBudget(null);
    setExtraContext("");
    setRecommendations(null);
    setError(null);
    setProfile(null);
    setActiveTab("plan");
    setPlanSaved(false);
    setShareId(null);
    setShowBooking(false);
  };

  if (step === 0) return <Landing onStart={() => setStep(1)} />;

  if (step === 1) {
    return (
      <PageShell>
        <BusinessTypeStep
          businessType={businessType}
          setBusinessType={setBusinessType}
          otherType={otherType}
          setOtherType={setOtherType}
          canAdvance={canAdvanceStep1}
          onNext={() => setStep(2)}
        />
      </PageShell>
    );
  }

  if (step === 2) {
    return (
      <PageShell>
        <PainPointsStep
          painPoints={painPoints}
          togglePainPoint={togglePainPoint}
          canAdvance={canAdvanceStep2}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      </PageShell>
    );
  }

  if (step === 3) {
    return (
      <PageShell>
        <DetailsStep
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          budget={budget}
          setBudget={setBudget}
          extraContext={extraContext}
          setExtraContext={setExtraContext}
          canAdvance={canAdvanceStep3}
          onBack={() => setStep(2)}
          onSubmit={getRecommendations}
        />
      </PageShell>
    );
  }

  return (
    <ResultsView
      loading={loading}
      error={error}
      onRetry={getRecommendations}
      recommendations={recommendations}
      profile={profile}
      businessLabel={profile?.businessType || ""}
      onRestart={restart}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      tasks={tasks}
      setTasks={setTasks}
      onAddTasks={addTasksFromPlan}
      onSavePlan={savePlan}
      planSaved={planSaved}
      shareId={shareId}
      showBooking={showBooking}
      setShowBooking={setShowBooking}
    />
  );
}
