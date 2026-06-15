import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlan } from "../lib/api.js";
import { storage } from "../lib/storage.js";
import { buildPlanTasks } from "../lib/tasks.js";
import { ResultsView } from "../components/results/ResultsView.jsx";

const TASKS_KEY = "tasks";

// The "/plan/:id" route: loads a saved plan and renders it read-only-ish (tasks, chat, and
// booking still work). Reuses ResultsView so a shared plan looks identical to a fresh one.
export function SharedPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("plan");
  const [planSaved, setPlanSaved] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const res = await storage.get(TASKS_KEY);
      if (active && res?.value) {
        try {
          setTasks(JSON.parse(res.value));
        } catch {
          /* ignore corrupt cache */
        }
      }
    })();

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

  const addTasksFromPlan = () => {
    const updated = [...tasks, ...buildPlanTasks(record?.plan)];
    setTasks(updated);
    storage.set(TASKS_KEY, JSON.stringify(updated));
    setActiveTab("tasks");
  };

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
      tasks={tasks}
      setTasks={setTasks}
      onAddTasks={addTasksFromPlan}
      onSavePlan={savePlan}
      planSaved={planSaved}
      shareUrl={typeof window !== "undefined" ? window.location.href : null}
      planId={id}
      showBooking={showBooking}
      setShowBooking={setShowBooking}
    />
  );
}
