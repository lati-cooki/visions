import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlan } from "../lib/api.js";
import { ResultsView } from "../components/results/ResultsView.jsx";

// The "/plan/:id" route: loads a saved plan and renders it read-only-ish (chat and booking
// still work). Reuses ResultsView so a shared plan looks identical to a fresh one.
export function SharedPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);

  const [activeTab, setActiveTab] = useState("plan");
  const [planSaved, setPlanSaved] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPlan(id);
        if (active) setRecord(data);
      } catch {
        if (active)
          setError("We couldn't load that plan. The link may be incorrect or expired.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const savePlan = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* clipboard may be unavailable */
    }
    setPlanSaved(true);
  };

  return (
    <ResultsView
      loading={loading}
      error={error}
      onRetry={() => window.location.reload()}
      recommendations={record?.plan || null}
      profile={record?.profile || null}
      businessLabel={record?.profile?.businessType || ""}
      onRestart={() => navigate("/")}
      restartLabel="New Plan"
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSavePlan={savePlan}
      planSaved={planSaved}
      shareUrl={typeof window !== "undefined" ? window.location.href : null}
      planId={id}
      showBooking={showBooking}
      setShowBooking={setShowBooking}
    />
  );
}
