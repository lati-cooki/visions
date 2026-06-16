// worker/src/lib/export.js
// Pure helpers for the admin "export all data" backup.

export function buildExport(bookings, plans, nowIso) {
  return { exported_at: nowIso, bookings, plans };
}

export function exportFilename(nowIso) {
  return `visions-export-${nowIso.slice(0, 10)}.json`;
}
