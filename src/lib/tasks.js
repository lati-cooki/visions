// Builds task-board entries from a generated plan. Shared by the advisor flow and the
// shared-plan page so "Add All to Tasks" behaves identically in both.

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function buildPlanTasks(recommendations) {
  if (!recommendations?.quick_wins) return [];

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

  if (!recommendations.next_step) return fromWins;

  return [
    {
      id: newId(),
      title: recommendations.next_step,
      status: "todo",
      source: "ai",
      createdAt: new Date().toISOString(),
      notes: "This Week Priority",
    },
    ...fromWins,
  ];
}
