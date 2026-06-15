// Short, URL-friendly id for shareable plan links and booking rows.
export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
