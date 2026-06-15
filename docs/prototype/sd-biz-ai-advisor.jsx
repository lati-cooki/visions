import { useState, useEffect, useRef } from "react";

// ─── DATA ───
const BUSINESS_TYPES = [
  { id: "restaurant", label: "Restaurant / Food & Bev", icon: "🍽️" },
  { id: "retail", label: "Retail / E-Commerce", icon: "🛍️" },
  { id: "services", label: "Professional Services", icon: "💼" },
  { id: "health", label: "Health & Wellness", icon: "🩺" },
  { id: "construction", label: "Construction / Trades", icon: "🔨" },
  { id: "creative", label: "Creative / Marketing", icon: "🎨" },
  { id: "realestate", label: "Real Estate", icon: "🏠" },
  { id: "other", label: "Other", icon: "⚡" },
];

const PAIN_POINTS = [
  { id: "leads", label: "Getting more customers / leads" },
  { id: "time", label: "Too many manual tasks eating my time" },
  { id: "social", label: "Keeping up with social media & marketing" },
  { id: "support", label: "Handling customer questions & support" },
  { id: "scheduling", label: "Scheduling, bookings & appointments" },
  { id: "inventory", label: "Inventory, ordering & supply chain" },
  { id: "bookkeeping", label: "Bookkeeping, invoicing & payments" },
  { id: "hiring", label: "Hiring & managing my team" },
  { id: "data", label: "Understanding my business data & trends" },
  { id: "content", label: "Creating content (photos, copy, video)" },
];

const TEAM_SIZES = [
  { id: "solo", label: "Just me" },
  { id: "small", label: "2–5 people" },
  { id: "medium", label: "6–20 people" },
  { id: "larger", label: "20+" },
];

const BUDGETS = [
  { id: "free", label: "Free tools only" },
  { id: "low", label: "Under $100/mo" },
  { id: "mid", label: "$100–500/mo" },
  { id: "high", label: "$500+/mo" },
];

const SD_PROVIDERS = [
  { name: "Lati Cooki LLC", focus: "AI Agents & Automation", desc: "Custom AI agent builds, workflow automation, and strategic AI advisory for small businesses.", url: "#", badge: "Featured" },
  { name: "SD AI Collective", focus: "Consulting & Training", desc: "Group workshops and 1-on-1 coaching for teams adopting AI tools.", url: "#", badge: null },
  { name: "Pacific Automation Co.", focus: "Process Automation", desc: "Zapier, Make, and custom integrations for local service businesses.", url: "#", badge: null },
  { name: "Coastal Digital", focus: "AI Marketing", desc: "AI-powered social media, SEO, and content strategies for SD brands.", url: "#", badge: null },
  { name: "Harbor Data Labs", focus: "Analytics & BI", desc: "Turn your business data into dashboards and forecasts with AI-driven insights.", url: "#", badge: null },
];

// ─── PALETTE ───
const P = {
  navy: "#0F2B3C",
  sand: "#FAF6F0",
  ocean: "#1A7FB5",
  coral: "#E26D5A",
  foam: "#6CC4A1",
  slate: "#475B6F",
  white: "#FFFFFF",
  border: "#E2DDD5",
  lightBlue: "#EDF5FA",
  red: "#DC2626",
  yellow: "#F59E0B",
};

// ─── SHARED STYLES ───
const btn = (active) => ({
  padding: "10px 20px", borderRadius: 10,
  border: active ? `2px solid ${P.ocean}` : `1.5px solid ${P.border}`,
  background: active ? P.lightBlue : P.white, color: P.navy,
  cursor: "pointer", fontSize: 15, fontWeight: active ? 600 : 400,
  transition: "all 0.15s", textAlign: "left", lineHeight: 1.4, fontFamily: "inherit",
});

const primaryBtn = (disabled) => ({
  padding: "14px 36px", borderRadius: 10, border: "none",
  background: disabled ? P.border : P.ocean, color: disabled ? P.slate : P.white,
  cursor: disabled ? "default" : "pointer", fontSize: 16, fontWeight: 600,
  letterSpacing: 0.3, opacity: disabled ? 0.7 : 1, fontFamily: "inherit",
});

const card = {
  background: P.white, borderRadius: 14, border: `1px solid ${P.border}`,
  padding: "24px", marginBottom: 14,
};

const sectionLabel = {
  fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
  color: P.slate, margin: "28px 0 14px",
};

// ─── TASK COMPONENT ───
function TaskBoard({ tasks, setTasks }) {
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  const addTask = (title, source = "manual") => {
    if (!title.trim()) return;
    const t = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: title.trim(), status: "todo", source,
      createdAt: new Date().toISOString(), notes: "",
    };
    const updated = [...tasks, t];
    setTasks(updated);
    saveTasks(updated);
    setNewTask("");
  };

  const updateTask = (id, changes) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...changes } : t);
    setTasks(updated);
    saveTasks(updated);
  };

  const removeTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  const saveTasks = async (t) => {
    try { await window.storage.set("sd-biz-tasks", JSON.stringify(t)); } catch {}
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
  const counts = { todo: tasks.filter(t => t.status === "todo").length, doing: tasks.filter(t => t.status === "doing").length, done: tasks.filter(t => t.status === "done").length };

  const statusColors = {
    todo: { bg: "#FEF3C7", color: "#92400E", label: "To Do" },
    doing: { bg: "#DBEAFE", color: "#1E40AF", label: "In Progress" },
    done: { bg: "#D1FAE5", color: "#065F46", label: "Done" },
  };

  const nextStatus = { todo: "doing", doing: "done", done: "todo" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "todo", "doing", "done"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === f ? P.ocean : P.border}`,
            background: filter === f ? P.lightBlue : P.white, color: filter === f ? P.ocean : P.slate,
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            {f === "all" ? `All (${tasks.length})` : `${statusColors[f].label} (${counts[f]})`}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTask(newTask)}
          placeholder="Add a task..."
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
        />
        <button onClick={() => addTask(newTask)} disabled={!newTask.trim()}
          style={{ ...primaryBtn(!newTask.trim()), padding: "10px 18px", fontSize: 14 }}>
          Add
        </button>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: P.slate, fontSize: 14 }}>
          {tasks.length === 0 ? "No tasks yet. Add one above or generate tasks from your AI plan." : "No tasks in this category."}
        </div>
      )}

      {filtered.map(t => {
        const sc = statusColors[t.status];
        return (
          <div key={t.id} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8, opacity: t.status === "done" ? 0.7 : 1 }}>
            <button onClick={() => updateTask(t.id, { status: nextStatus[t.status] })}
              title={`Move to ${statusColors[nextStatus[t.status]].label}`}
              style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${sc.color}`, background: t.status === "done" ? sc.bg : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: sc.color, padding: 0 }}>
              {t.status === "done" ? "✓" : ""}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, textDecoration: t.status === "done" ? "line-through" : "none", lineHeight: 1.4 }}>{t.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: sc.bg, color: sc.color, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{sc.label}</span>
                {t.source === "ai" && <span style={{ background: P.lightBlue, color: P.ocean, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>From AI Plan</span>}
              </div>
            </div>
            <button onClick={() => removeTask(t.id)} style={{ border: "none", background: "none", color: P.border, cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }} title="Remove">×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ───
export default function SDBizAdvisor() {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState(null);
  const [otherType, setOtherType] = useState("");
  const [painPoints, setPainPoints] = useState([]);
  const [teamSize, setTeamSize] = useState(null);
  const [budget, setBudget] = useState(null);
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);
  const [followUp, setFollowUp] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("plan");
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: "", email: "", phone: "", preferred: "morning", message: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  // Load tasks from storage
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("sd-biz-tasks");
        if (res?.value) setTasks(JSON.parse(res.value));
      } catch {}
      setTasksLoaded(true);
    })();
  }, []);

  const togglePainPoint = (id) => {
    setPainPoints(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const canAdvance = () => {
    if (step === 1) return businessType !== null && (businessType !== "other" || otherType.trim());
    if (step === 2) return painPoints.length >= 1;
    if (step === 3) return teamSize !== null && budget !== null;
    return true;
  };

  const getBusinessLabel = () => {
    if (businessType === "other") return otherType;
    return BUSINESS_TYPES.find(b => b.id === businessType)?.label || "";
  };

  const getPainLabels = () => painPoints.map(id => PAIN_POINTS.find(p => p.id === id)?.label).filter(Boolean);

  const getRecommendations = async () => {
    setLoading(true);
    setError(null);
    setStep(4);
    setActiveTab("plan");

    const prompt = `You are an AI business advisor specializing in helping small businesses in San Diego adopt AI tools and agents. A local business owner just completed an intake assessment. Give them a personalized, actionable plan.

THEIR PROFILE:
- Business type: ${getBusinessLabel()}
- Top pain points: ${getPainLabels().join("; ")}
- Team size: ${TEAM_SIZES.find(t => t.id === teamSize)?.label}
- Monthly budget for AI tools: ${BUDGETS.find(b => b.id === budget)?.label}
${extraContext ? `- Additional context: ${extraContext}` : ""}

Respond ONLY with valid JSON (no markdown, no backticks, no preamble). Use this exact structure:
{
  "headline": "A short, encouraging 1-sentence summary tailored to their business",
  "quick_wins": [
    {
      "title": "Short title",
      "description": "2-3 sentences on what to do and why it helps",
      "tools": ["Tool Name 1", "Tool Name 2"],
      "effort": "easy|medium|advanced",
      "monthly_cost": "$0 or $XX/mo",
      "task": "One specific actionable task they can do to implement this"
    }
  ],
  "agent_opportunity": {
    "title": "One custom AI agent idea specific to their business",
    "description": "3-4 sentences describing a custom AI agent or workflow that could transform a key part of their operation",
    "impact": "What measurable improvement they could expect"
  },
  "next_step": "One specific thing they should do THIS WEEK to get started"
}

Give 3-4 quick_wins ranked by impact. Be specific about real tools (ChatGPT, Claude, Zapier, HubSpot, Square, Toast, Calendly, Canva, etc). Keep costs within their stated budget. Be practical and San Diego-aware (mention local context like tourism seasons, border trade, military community, beach/surf culture where relevant).`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
      });
      if (!response.ok) {
        const errBody = await response.text();
        console.error("API error:", response.status, errBody);
        throw new Error(`API returned ${response.status}`);
      }
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      if (!text) throw new Error("Empty response from API");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!parsed.headline || !parsed.quick_wins) throw new Error("Incomplete response");
      setRecommendations(parsed);
    } catch (err) {
      console.error("Plan generation error:", err);
      setError("Something went wrong generating your plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const planData = {
      id, businessType: getBusinessLabel(), painPoints: getPainLabels(),
      teamSize: TEAM_SIZES.find(t => t.id === teamSize)?.label,
      budget: BUDGETS.find(b => b.id === budget)?.label,
      recommendations, createdAt: new Date().toISOString(),
    };
    try {
      await window.storage.set(`sd-biz-plan:${id}`, JSON.stringify(planData), true);
      setShareId(id);
      setPlanSaved(true);
    } catch { setPlanSaved(false); }
  };

  const addTasksFromPlan = () => {
    if (!recommendations?.quick_wins) return;
    const newTasks = recommendations.quick_wins
      .filter(w => w.task)
      .map(w => ({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: w.task, status: "todo", source: "ai",
        createdAt: new Date().toISOString(), notes: w.title,
      }));
    if (recommendations.next_step) {
      newTasks.unshift({
        id: Date.now().toString(36) + "ns",
        title: recommendations.next_step, status: "todo", source: "ai",
        createdAt: new Date().toISOString(), notes: "This Week Priority",
      });
    }
    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    try { window.storage.set("sd-biz-tasks", JSON.stringify(updated)); } catch {}
    setActiveTab("tasks");
  };

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    const userMsg = followUp.trim();
    setFollowUp("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    const systemContext = `You are an AI business advisor for San Diego small businesses. You previously gave recommendations to a ${getBusinessLabel()} business (team: ${TEAM_SIZES.find(t => t.id === teamSize)?.label}, budget: ${BUDGETS.find(b => b.id === budget)?.label}). Their pain points: ${getPainLabels().join(", ")}. Answer their follow-up concisely (3-5 sentences). Be specific and actionable.`;

    const messages = [
      { role: "user", content: systemContext + "\n\nPrevious recommendations: " + recommendations?.headline },
      { role: "assistant", content: "I'm ready to help with follow-up questions about implementing AI in your business." },
      ...chatHistory.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg },
    ];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2048, messages }),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      setChatHistory(prev => [...prev, { role: "assistant", content: text || "I didn't get a response. Please try again." }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally { setChatLoading(false); }
  };

  const restart = () => {
    setStep(0); setBusinessType(null); setOtherType(""); setPainPoints([]);
    setTeamSize(null); setBudget(null); setExtraContext(""); setRecommendations(null);
    setError(null); setChatHistory([]); setActiveTab("plan"); setPlanSaved(false);
    setShareId(null); setShowBooking(false); setBookingSubmitted(false);
  };

  const effortBadge = (effort) => {
    const m = { easy: { bg: "#D1FAE5", color: "#065F46", label: "Quick Start" }, medium: { bg: "#FEF3C7", color: "#92400E", label: "Some Setup" }, advanced: { bg: "#DBEAFE", color: "#1E40AF", label: "Deeper Build" } };
    const e = m[effort] || m.easy;
    return <span style={{ background: e.bg, color: e.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{e.label}</span>;
  };

  const progressDots = (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{ width: step >= s ? 32 : 10, height: 10, borderRadius: 5, background: step >= s ? P.ocean : P.border, transition: "all 0.3s" }} />
      ))}
    </div>
  );

  const wrap = {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    minHeight: "100vh",
    background: `linear-gradient(168deg, ${P.sand} 0%, ${P.white} 50%, ${P.lightBlue} 100%)`,
    color: P.navy, padding: 0, margin: 0,
  };

  const container = { maxWidth: 660, margin: "0 auto", padding: "32px 20px 60px" };

  // ─── LANDING ───
  if (step === 0) {
    return (
      <div style={wrap}>
        <div style={{ ...container, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "90vh", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${P.ocean}, ${P.foam})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20, boxShadow: "0 4px 16px rgba(26,127,181,0.25)" }}>
            🏄
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2.5, color: P.ocean, textTransform: "uppercase", marginBottom: 14 }}>
            San Diego
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.1, margin: "0 0 14px", maxWidth: 500 }}>
            Small Business<br /><span style={{ color: P.ocean }}>AI Advisor</span>
          </h1>
          <p style={{ color: P.slate, fontSize: 17, lineHeight: 1.65, maxWidth: 440, margin: "0 0 36px" }}>
            Answer a few quick questions about your business. Get a personalized AI toolkit, actionable tasks, and connect with local experts who can help you implement.
          </p>
          <button style={{ ...primaryBtn(false), padding: "16px 40px", fontSize: 17 }} onClick={() => setStep(1)}>
            Get My Free AI Plan →
          </button>
          <p style={{ color: P.slate, fontSize: 13, marginTop: 16, opacity: 0.65 }}>
            60 seconds · No signup · Powered by Claude
          </p>

          {/* Quick stats */}
          <div style={{ display: "flex", gap: 24, marginTop: 48 }}>
            {[{ n: "500+", l: "SD businesses helped" }, { n: "4 min", l: "avg. time to first win" }, { n: "Free", l: "always" }].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: P.ocean }}>{s.n}</div>
                <div style={{ fontSize: 12, color: P.slate, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 1: BUSINESS TYPE ───
  if (step === 1) {
    return (
      <div style={wrap}><div style={container}>
        {progressDots}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>What kind of business do you run?</h2>
        <p style={{ color: P.slate, fontSize: 15, marginBottom: 24 }}>Pick the closest match.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {BUSINESS_TYPES.map(b => (
            <button key={b.id} style={btn(businessType === b.id)} onClick={() => setBusinessType(b.id)}>
              <span style={{ marginRight: 8 }}>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>
        {businessType === "other" && (
          <input type="text" placeholder="Describe your business..." value={otherType}
            onChange={e => setOtherType(e.target.value)}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 15, marginTop: 12, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
          />
        )}
        <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
          <button style={primaryBtn(!canAdvance())} disabled={!canAdvance()} onClick={() => setStep(2)}>Next →</button>
        </div>
      </div></div>
    );
  }

  // ─── STEP 2: PAIN POINTS ───
  if (step === 2) {
    return (
      <div style={wrap}><div style={container}>
        {progressDots}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Where does it hurt?</h2>
        <p style={{ color: P.slate, fontSize: 15, marginBottom: 24 }}>Pick up to 4 pain points you'd most like AI to help with.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PAIN_POINTS.map(p => {
            const active = painPoints.includes(p.id);
            const disabled = !active && painPoints.length >= 4;
            return (
              <button key={p.id} style={{ ...btn(active), opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer" }}
                onClick={() => !disabled && togglePainPoint(p.id)}>
                <span style={{ marginRight: 8, fontSize: 13 }}>{active ? "✔" : "○"}</span>{p.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between" }}>
          <button style={{ ...btn(false), border: "none", color: P.slate }} onClick={() => setStep(1)}>← Back</button>
          <button style={primaryBtn(!canAdvance())} disabled={!canAdvance()} onClick={() => setStep(3)}>Next →</button>
        </div>
      </div></div>
    );
  }

  // ─── STEP 3: DETAILS ───
  if (step === 3) {
    return (
      <div style={wrap}><div style={container}>
        {progressDots}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>A couple more details</h2>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Team size</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {TEAM_SIZES.map(t => <button key={t.id} style={btn(teamSize === t.id)} onClick={() => setTeamSize(t.id)}>{t.label}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Monthly budget for AI tools</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {BUDGETS.map(b => <button key={b.id} style={btn(budget === b.id)} onClick={() => setBudget(b.id)}>{b.label}</button>)}
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Anything else? <span style={{ fontWeight: 400, color: P.slate }}>(optional)</span></p>
          <textarea value={extraContext} onChange={e => setExtraContext(e.target.value)}
            placeholder="E.g., I run a surf shop in PB and most of my customers find me on Instagram..."
            rows={3} style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 15, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none", lineHeight: 1.5 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button style={{ ...btn(false), border: "none", color: P.slate }} onClick={() => setStep(2)}>← Back</button>
          <button style={primaryBtn(!canAdvance())} disabled={!canAdvance()} onClick={getRecommendations}>Get My AI Plan ✨</button>
        </div>
      </div></div>
    );
  }

  // ─── STEP 4: RESULTS ───
  const tabs = [
    { id: "plan", label: "AI Plan" },
    { id: "tasks", label: `Tasks${tasks.length ? ` (${tasks.length})` : ""}` },
    { id: "directory", label: "SD Experts" },
  ];

  return (
    <div style={wrap}><div style={container}>
      {loading && (
        <div style={{ textAlign: "center", paddingTop: 100 }}>
          <div style={{ fontSize: 44, marginBottom: 20, animation: "pulse 1.5s infinite" }}>🤖</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Building your AI plan...</h2>
          <p style={{ color: P.slate, fontSize: 15 }}>Analyzing your business and matching you with the right tools.</p>
          <style>{`@keyframes pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.15) } }`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <p style={{ color: P.coral, fontSize: 16, marginBottom: 20 }}>{error}</p>
          <button style={primaryBtn(false)} onClick={getRecommendations}>Try Again</button>
        </div>
      )}

      {recommendations && !loading && (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: P.ocean, textTransform: "uppercase" }}>Your AI Plan</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>{getBusinessLabel()}</h2>
            </div>
            <button onClick={restart} style={{ ...btn(false), fontSize: 13, padding: "6px 14px", border: `1px solid ${P.border}` }}>Start Over</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${P.border}`, marginBottom: 24, marginTop: 16 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: "10px 20px", border: "none", borderBottom: activeTab === t.id ? `3px solid ${P.ocean}` : "3px solid transparent",
                background: "none", color: activeTab === t.id ? P.ocean : P.slate,
                fontWeight: activeTab === t.id ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                marginBottom: -2, transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── PLAN TAB ─── */}
          {activeTab === "plan" && (
            <>
              <div style={{ ...card, background: `linear-gradient(135deg, ${P.navy} 0%, #1A4A6B 100%)`, color: P.white, border: "none" }}>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, fontWeight: 500 }}>{recommendations.headline}</p>
              </div>

              {/* Action bar */}
              <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
                <button onClick={addTasksFromPlan} style={{ ...btn(false), fontSize: 13, padding: "8px 14px", background: P.lightBlue, border: `1.5px solid ${P.ocean}30`, color: P.ocean, fontWeight: 600 }}>
                  📋 Add All to Tasks
                </button>
                <button onClick={savePlan} style={{ ...btn(false), fontSize: 13, padding: "8px 14px" }}>
                  {planSaved ? "✓ Saved" : "💾 Save Plan"}
                </button>
                <button onClick={() => setShowBooking(true)} style={{ ...btn(false), fontSize: 13, padding: "8px 14px", background: P.coral, color: P.white, border: `1.5px solid ${P.coral}`, fontWeight: 600 }}>
                  📅 Book a Consultation
                </button>
              </div>

              {planSaved && shareId && (
                <div style={{ ...card, background: P.lightBlue, border: `1.5px solid ${P.ocean}30`, padding: "14px 18px", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Plan saved!</span> Share this ID with your consultant: <code style={{ background: P.white, padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 14 }}>{shareId}</code>
                </div>
              )}

              <p style={sectionLabel}>Quick Wins</p>
              {recommendations.quick_wins?.map((win, i) => (
                <div key={i} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>{win.title}</h4>
                    {effortBadge(win.effort)}
                  </div>
                  <p style={{ margin: "0 0 12px", color: P.slate, fontSize: 14, lineHeight: 1.6 }}>{win.description}</p>
                  {win.task && (
                    <div style={{ background: P.sand, padding: "8px 12px", borderRadius: 8, fontSize: 13, color: P.navy, marginBottom: 12, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>Action:</span> {win.task}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {win.tools?.map((tool, j) => (
                      <span key={j} style={{ background: P.lightBlue, color: P.ocean, padding: "3px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500 }}>{tool}</span>
                    ))}
                    {win.monthly_cost && <span style={{ color: P.slate, fontSize: 13, marginLeft: 4 }}>{win.monthly_cost}</span>}
                  </div>
                </div>
              ))}

              {recommendations.agent_opportunity && (
                <>
                  <p style={sectionLabel}>🤖 Custom Agent Opportunity</p>
                  <div style={{ ...card, borderLeft: `4px solid ${P.coral}` }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600 }}>{recommendations.agent_opportunity.title}</h4>
                    <p style={{ margin: "0 0 10px", color: P.slate, fontSize: 14, lineHeight: 1.6 }}>{recommendations.agent_opportunity.description}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: P.foam }}>Expected impact: {recommendations.agent_opportunity.impact}</p>
                  </div>
                </>
              )}

              {recommendations.next_step && (
                <div style={{ ...card, background: P.lightBlue, border: `1.5px solid ${P.ocean}30` }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: P.ocean, marginBottom: 6 }}>This Week</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.5 }}>{recommendations.next_step}</p>
                </div>
              )}

              {/* Follow-up Chat */}
              <div style={{ marginTop: 32, borderTop: `1px solid ${P.border}`, paddingTop: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Have questions? Ask away.</h3>
                {chatHistory.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "85%", padding: "10px 16px",
                      borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: msg.role === "user" ? P.ocean : P.white,
                      color: msg.role === "user" ? P.white : P.navy,
                      fontSize: 14, lineHeight: 1.6,
                      border: msg.role === "user" ? "none" : `1px solid ${P.border}`,
                    }}>{msg.content}</div>
                  </div>
                ))}
                {chatLoading && <div style={{ fontSize: 14, color: P.slate, marginBottom: 10, fontStyle: "italic" }}>Thinking...</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" value={followUp} onChange={e => setFollowUp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askFollowUp()}
                    placeholder="E.g., How do I set up that AI agent?"
                    style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 15, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                  />
                  <button onClick={askFollowUp} disabled={!followUp.trim() || chatLoading}
                    style={{ ...primaryBtn(!followUp.trim() || chatLoading), padding: "12px 20px", fontSize: 15 }}>Ask</button>
                </div>
              </div>
            </>
          )}

          {/* ─── TASKS TAB ─── */}
          {activeTab === "tasks" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Your AI Implementation Tasks</h3>
                  <p style={{ margin: "4px 0 0", color: P.slate, fontSize: 13 }}>Track your progress as you adopt AI tools.</p>
                </div>
                {recommendations?.quick_wins && (
                  <button onClick={addTasksFromPlan} style={{ ...btn(false), fontSize: 12, padding: "6px 12px", color: P.ocean, border: `1px solid ${P.ocean}30` }}>
                    + From Plan
                  </button>
                )}
              </div>
              <TaskBoard tasks={tasks} setTasks={setTasks} />
            </>
          )}

          {/* ─── DIRECTORY TAB ─── */}
          {activeTab === "directory" && (
            <>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>San Diego AI Service Providers</h3>
              <p style={{ margin: "0 0 20px", color: P.slate, fontSize: 14 }}>Local experts who can help you implement your AI plan.</p>
              {SD_PROVIDERS.map((prov, i) => (
                <div key={i} style={{ ...card, display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${P.ocean}20, ${P.foam}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {prov.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{prov.name}</h4>
                      {prov.badge && <span style={{ background: P.coral, color: P.white, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{prov.badge}</span>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: P.ocean, marginBottom: 6 }}>{prov.focus}</div>
                    <p style={{ margin: 0, color: P.slate, fontSize: 13, lineHeight: 1.5 }}>{prov.desc}</p>
                  </div>
                </div>
              ))}

              <div style={{ ...card, background: P.sand, textAlign: "center", marginTop: 8 }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 500 }}>Are you a San Diego AI service provider?</p>
                <button style={{ ...primaryBtn(false), padding: "10px 24px", fontSize: 14 }} onClick={() => setShowBooking(true)}>
                  Get Listed
                </button>
              </div>
            </>
          )}

          {/* ─── BOOKING MODAL ─── */}
          {showBooking && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,43,60,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}
              onClick={e => e.target === e.currentTarget && setShowBooking(false)}>
              <div style={{ background: P.white, borderRadius: 18, padding: 32, maxWidth: 460, width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                {bookingSubmitted ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                    <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>You're booked!</h3>
                    <p style={{ color: P.slate, fontSize: 15, lineHeight: 1.6 }}>We'll reach out within 24 hours to confirm your consultation time. Check your email for details.</p>
                    <button onClick={() => { setShowBooking(false); setBookingSubmitted(false); }} style={{ ...primaryBtn(false), marginTop: 20, padding: "12px 28px" }}>Close</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Book a Free Consultation</h3>
                        <p style={{ margin: 0, color: P.slate, fontSize: 14 }}>30 minutes with a San Diego AI advisor</p>
                      </div>
                      <button onClick={() => setShowBooking(false)} style={{ border: "none", background: "none", fontSize: 24, cursor: "pointer", color: P.slate, padding: 0, lineHeight: 1 }}>×</button>
                    </div>

                    <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                      {[
                        { key: "name", label: "Name", placeholder: "Your full name", type: "text" },
                        { key: "email", label: "Email", placeholder: "you@business.com", type: "email" },
                        { key: "phone", label: "Phone", placeholder: "(619) 555-0123", type: "tel" },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>{f.label}</label>
                          <input type={f.type} placeholder={f.placeholder} value={bookingForm[f.key]}
                            onChange={e => setBookingForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      ))}

                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>Preferred time</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[{ id: "morning", l: "Morning" }, { id: "afternoon", l: "Afternoon" }].map(t => (
                            <button key={t.id} style={btn(bookingForm.preferred === t.id)} onClick={() => setBookingForm(prev => ({ ...prev, preferred: t.id }))}>
                              {t.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "block" }}>What do you need help with? <span style={{ fontWeight: 400, color: P.slate }}>(optional)</span></label>
                        <textarea value={bookingForm.message} onChange={e => setBookingForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="E.g., I want help setting up the AI chatbot from my plan..."
                          rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                        />
                      </div>

                      <button
                        disabled={!bookingForm.name || !bookingForm.email}
                        onClick={() => setBookingSubmitted(true)}
                        style={{ ...primaryBtn(!bookingForm.name || !bookingForm.email), marginTop: 8, width: "100%" }}>
                        Request Consultation →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div></div>
  );
}
