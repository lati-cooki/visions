import { useState } from "react";
import { storage } from "../../lib/storage.js";

// Status metadata from the design (dot color + tinted pill background). Internal keys stay
// todo/doing/done to match the rest of the app + persisted data.
const STATUS = {
  todo: { label: "To Do", dot: "#E26D5A", bg: "bg-[#fff0ec]", border: "border-[#E26D5A55]" },
  doing: { label: "In Progress", dot: "#1A7FB5", bg: "bg-brand-lightblue", border: "border-[#1A7FB555]" },
  done: { label: "Done", dot: "#6CC4A1", bg: "bg-[#e9f6f0]", border: "border-[#6CC4A155]" },
};
const NEXT = { todo: "doing", doing: "done", done: "todo" };
const FILTERS = [
  { id: "all", label: "All" },
  { id: "todo", label: "To Do" },
  { id: "doing", label: "In Progress" },
  { id: "done", label: "Done" },
];
const TASKS_KEY = "tasks";
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function TaskBoard({ tasks, setTasks }) {
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  const persist = (updated) => {
    setTasks(updated);
    storage.set(TASKS_KEY, JSON.stringify(updated));
  };

  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;
    persist([
      ...tasks,
      { id: newId(), title, status: "todo", source: "manual", createdAt: new Date().toISOString(), notes: "" },
    ]);
    setNewTask("");
  };

  const cycle = (id) =>
    persist(tasks.map((t) => (t.id === id ? { ...t, status: NEXT[t.status] } : t)));
  const remove = (id) => persist(tasks.filter((t) => t.id !== id));

  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <div className="mb-[18px] flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.01em]">Your tasks</h2>
        <span className="text-[13px] font-semibold text-[#9aa7b1]">{tasks.length} total</span>
      </div>

      <div className="mb-[18px] flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-[15px] py-2 text-[13px] font-semibold transition focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean ${
              filter === f.id
                ? "border-[1.5px] border-brand-navy bg-brand-navy text-white"
                : "border border-brand-border bg-white text-brand-slate"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-[18px] flex gap-[9px]">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task…"
          aria-label="Add a task"
          className="min-w-0 flex-1 rounded-[12px] border border-brand-border px-[15px] py-[13px] text-[15px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
        />
        <button
          onClick={addTask}
          className="whitespace-nowrap rounded-[12px] bg-brand-ocean px-[22px] py-[13px] text-[15px] font-bold text-white transition hover:bg-brand-navy"
        >
          ＋ Add
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {visible.map((t) => {
          const s = STATUS[t.status];
          return (
            <div
              key={t.id}
              className="flex items-center gap-3.5 rounded-[12px] border border-brand-border bg-white px-4 py-[15px]"
            >
              <button
                onClick={() => cycle(t.id)}
                title="Click to change status"
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-bold text-brand-navy focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand-ocean ${s.bg} ${s.border}`}
              >
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.dot }} />
                {s.label}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[15px] font-semibold ${
                    t.status === "done" ? "text-[#9aa7b1] line-through" : "text-brand-navy"
                  }`}
                >
                  {t.title}
                </div>
                {t.source === "ai" && (
                  <div className="mt-[7px] flex flex-wrap gap-1.5">
                    <span className="rounded-md border border-brand-border bg-[#f3eee6] px-2 py-0.5 text-[11px] font-semibold text-brand-slate">
                      From plan
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                title="Remove"
                aria-label="Remove task"
                className="px-1 text-lg leading-none text-brand-border transition hover:text-brand-coral"
              >
                ×
              </button>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-brand-border bg-white px-5 py-[46px] text-center text-[#9aa7b1]">
            <div className="text-[15px] font-semibold">Nothing here yet</div>
            <div className="mt-[5px] text-[13px]">
              {tasks.length === 0
                ? "Add one above, or use “Add to Tasks” on your plan."
                : "Tasks with this status will show up here."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
