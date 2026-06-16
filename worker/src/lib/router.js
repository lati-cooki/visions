// Pure request router: maps (method, pathname) to a route descriptor. Kept free of the
// Workers runtime so it's unit-testable with `node --test`. index.js does the dispatch.
export function resolveRoute(method, pathname) {
  if (method === "GET" && pathname === "/api/health") return { name: "health" };
  if (method === "POST" && pathname === "/api/plan") return { name: "plan" };
  if (method === "GET" && pathname.startsWith("/api/plan/")) {
    const id = decodeURIComponent(pathname.slice("/api/plan/".length));
    return id ? { name: "getPlan", id } : null;
  }
  if (method === "POST" && pathname === "/api/chat") return { name: "chat" };
  if (method === "POST" && pathname === "/api/booking") return { name: "booking" };
  if (method === "POST" && pathname === "/api/verify/start") return { name: "verifyStart" };
  if (method === "POST" && pathname === "/api/verify/check") return { name: "verifyCheck" };
  if (method === "GET" && pathname === "/api/admin/bookings") return { name: "adminBookings" };
  if (method === "GET" && pathname === "/api/admin/plans") return { name: "adminPlans" };
  if (method === "GET" && pathname === "/api/admin/export") return { name: "adminExport" };
  return null;
}
