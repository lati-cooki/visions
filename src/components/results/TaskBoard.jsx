import { useState } from "react";
import { storage } from "../../lib/storage.js";
import { Button } from "../ui/Button.jsx";

const STATUS = {
  todo: { className: "bg-amber-100 text-amber-800", ring: "border-amber-800", label: "To Do" },
  doing: { className: "bg-blue-100 text-blue-800", ring: "border-blue-800", label: "In Progress" },
  done: { className: "bg-emerald-100 text-emerald-800", ring: "border-emerald-800", label: "Done" },
};

const NEXT_STATUS = { todo: "doing", doing: "done", done: "todo" };
const TASKS_KEY = "tasks";

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Kanban-lite task board. One-click status cycling, manual add, AI-sourced tagging.
// Persists to storage on every mutation (localStorage today; backend later).
export function TaskBoard({ tasks, setTasks }) {
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  const persist = (updated) => {
    setTasks(updated);
    storage.set(TASKS_KEY, JSON.stringify(updated));
  };

  const addTask = (title, source = "manual") => {
    if (!title.trim()) return;
    persist([
      ...tasks,
      {
        id: newId(),
        title: title.trim(),
        status: "todo",
        source,
        createdAt: new Date().toISOString(),
        notes: "",
      },
    ]);
    setNewTask("");
  };

  const updateTask = (id, changes) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  const removeTask = (id) => persist(tasks.filter((t) => t.id !== id));

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const counts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "todo", "doing", "done"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-[20px] border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition ${
              filter === f
                ? "border-brand-ocean bg-brand-lightblue text-brand-ocean"
                : "border-brand-border bg-white text-brand-slate"
            }`}
          >
            {f === "all" ? `All (${tasks.length})` : `${STATUS[f].label} (${counts[f]})`}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask(newTask)}
          placeholder="Add a task..."
          className="box-border flex-1 rounded-[10px] border-[1.5px] border-brand-border px-3.5 py-2.5 text-sm outline-none"
        />
        <Button
          variant="primary"
          className="px-[18px] py-2.5 text-sm"
          disabled={!newTask.trim()}
          onClick={() => addTask(newTask)}
        >
          Add
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-brand-slate">
          {tasks.length === 0
            ? "No tasks yet. Add one above or generate tasks from your AI plan."
            : "No tasks in this category."}
        </div>
      )}

      {filtered.map((t) => {
        const sc = STATUS[t.status];
        return (
          <div
            key={t.id}
            className={`mb-2 flex items-start gap-3 rounded-card border border-brand-border bg-white px-[18px] py-3.5 ${
              t.status === "done" ? "opacity-70" : ""
            }`}
          >
            <button
              onClick={() => updateTask(t.id, { status: NEXT_STATUS[t.status] })}
              title={`Move to ${STATUS[NEXT_STATUS[t.status]].label}`}
              className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 text-xs ${sc.ring} ${
                t.status === "done" ? sc.className : "bg-transparent"
              }`}
            >
              {t.status === "done" ? "✓" : ""}
            </button>

            <div className="min-w-0 flex-1">
              <div
                className={`text-sm font-medium leading-snug ${
                  t.status === "done" ? "line-through" : ""
                }`}
              >
                {t.title}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-[10px] px-2 py-px text-[11px] font-semibold ${sc.className}`}>
                  {sc.label}
                </span>
                {t.source === "ai" && (
                  <span className="rounded-[10px] bg-brand-lightblue px-2 py-px text-[11px] font-semibold text-brand-ocean">
                    From AI Plan
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => removeTask(t.id)}
              title="Remove"
              className="px-1 text-lg leading-none text-brand-border"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
