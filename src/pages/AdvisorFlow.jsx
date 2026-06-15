import { useState } from "react";
import { MAX_PAIN_POINTS } from "../data/intake.js";
import { buildProfile } from "../lib/profile.js";
import { generatePlan } from "../lib/api.js";
import { Landing } from "../components/Landing.jsx";
import { PageShell } from "../components/Layout.jsx";
import { BusinessTypeStep } from "../components/intake/BusinessTypeStep.jsx";
import { PainPointsStep } from "../components/intake/PainPointsStep.jsx";
import { DetailsStep } from "../components/intake/DetailsStep.jsx";
import { EmailVerifyStep } from "../components/intake/EmailVerifyStep.jsx";
import { ResultsView } from "../components/results/ResultsView.jsx";

// The "/" route: owns the intake → plan → results state machine. Rendering is delegated to
// the step/results components; state and handlers live here.
export function AdvisorFlow() {
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
  const [planId, setPlanId] = useState(null);
  const [verifyToken, setVerifyToken] = useState(""); // from EmailVerifyStep

  // Results
  const [activeTab, setActiveTab] = useState("plan");
  const [planSaved, setPlanSaved] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const togglePainPoint = (id) =>
    setPainPoints((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PAIN_POINTS) return prev;
      return [...prev, id];
    });

  const canAdvanceStep1 = businessType !== null && (businessType !== "other" || otherType.trim());
  const canAdvanceStep2 = painPoints.length >= 1;
  const canAdvanceStep3 = teamSize !== null && budget !== null;

  const shareUrl = planId ? `${window.location.origin}/plan/${planId}` : null;

  const getRecommendations = async (token) => {
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
    setPlanId(null);
    setPlanSaved(false);
    setStep(5);
    setActiveTab("plan");

    try {
      const { id, plan } = await generatePlan(snapshot, token || verifyToken);
      if (!plan?.headline || !plan?.quick_wins) throw new Error("Incomplete response");
      setRecommendations(plan);
      setPlanId(id);
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Something went wrong generating your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // The plan is already persisted server-side; "Save" surfaces the share link and copies it.
  const savePlan = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard?.writeText(shareUrl);
    } catch {
      /* clipboard may be unavailable; the link is shown regardless */
    }
    setPlanSaved(true);
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
    setPlanId(null);
    setVerifyToken("");
    setActiveTab("plan");
    setPlanSaved(false);
    setShowBooking(false);
  };

  if (step === 0) return <Landing onStart={() => setStep(1)} />;

  if (step === 1) {
    return (
      <PageShell width="narrow" onHome={restart}>
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
      <PageShell width="narrow" onHome={restart}>
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
      <PageShell width="narrow" onHome={restart}>
        <DetailsStep
          teamSize={teamSize}
          setTeamSize={setTeamSize}
          budget={budget}
          setBudget={setBudget}
          extraContext={extraContext}
          setExtraContext={setExtraContext}
          canAdvance={canAdvanceStep3}
          onBack={() => setStep(2)}
          onSubmit={() => setStep(4)}
        />
      </PageShell>
    );
  }

  if (step === 4) {
    return (
      <PageShell width="narrow" onHome={restart}>
        <EmailVerifyStep
          onBack={() => setStep(3)}
          onVerified={(token) => {
            setVerifyToken(token);
            getRecommendations(token);
          }}
        />
      </PageShell>
    );
  }

  return (
    <ResultsView
      loading={loading}
      error={error}
      onRetry={() => setStep(4)}
      recommendations={recommendations}
      profile={profile}
      businessLabel={profile?.businessType || ""}
      onRestart={restart}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSavePlan={savePlan}
      planSaved={planSaved}
      shareUrl={shareUrl}
      planId={planId}
      showBooking={showBooking}
      setShowBooking={setShowBooking}
    />
  );
}
