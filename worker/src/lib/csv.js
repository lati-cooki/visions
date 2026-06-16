// worker/src/lib/csv.js
// Pure RFC-4180 CSV serializer. `columns` is [{ key, label }]; the header row uses labels,
// each data row pulls row[key]. Fields containing " , CR or LF are quoted with embedded
// quotes doubled; null/undefined become empty cells.

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(","))
    .join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}
