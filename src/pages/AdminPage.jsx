import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/Layout.jsx";
import { getAdminBookings, getAdminPlans } from "../lib/api.js";

const TABS = [
  { id: "bookings", label: "Bookings" },
  { id: "plans", label: "Plans" },
];

const fmtDate = (s) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s || "" : d.toLocaleString();
};

// CSV downloads are plain links to the Access-gated API (same-origin in prod; the Access
// cookie rides along). Inert in pure-frontend mock mode.
const csvHref = (path) => `/api/admin/${path}?format=csv`;

const th = "px-3 py-2.5 text-left text-[12px] font-bold uppercase tracking-[0.04em] text-brand-slate";
const td = "px-3 py-2.5 align-top text-[14px] text-brand-navy";

export function AdminPage() {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState(null);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [b, p] = await Promise.all([getAdminBookings(), getAdminPlans()]);
        if (active) {
          setBookings(b.bookings || []);
          setPlans(p.plans || []);
        }
      } catch {
        if (active) setError("Couldn't load admin data. Make sure you're signed in.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const rows = tab === "bookings" ? bookings : plans;

  return (
    <PageShell width="wide">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">Admin</h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/export"
            className="rounded-[11px] bg-brand-ocean px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-navy"
          >
            ⬇ Export all data
          </a>
          <a
            href={csvHref(tab)}
            className="rounded-[11px] border border-brand-border bg-white px-4 py-2.5 text-[14px] font-bold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy"
          >
            ↓ Download {tab === "bookings" ? "bookings" : "plans"} CSV
          </a>
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-brand-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-[2.5px] px-[18px] py-3 text-[15px] font-semibold transition ${
              tab === t.id
                ? "border-brand-ocean text-brand-navy"
                : "border-transparent text-brand-slate hover:text-brand-navy"
            }`}
          >
            {t.label}
            {t.id === "bookings" && bookings ? ` (${bookings.length})` : ""}
            {t.id === "plans" && plans ? ` (${plans.length})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="text-[15px] font-semibold text-brand-coral">{error}</p>}
      {!error && rows === null && <p className="text-[15px] text-brand-slate">Loading…</p>}
      {!error && rows && rows.length === 0 && (
        <div className="rounded-[12px] border border-dashed border-brand-border bg-white px-5 py-12 text-center text-[#9aa7b1]">
          Nothing here yet.
        </div>
      )}

      {!error && rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-[12px] border border-brand-border bg-white">
          <table className="w-full border-collapse">
            {tab === "bookings" ? (
              <>
                <thead className="border-b border-brand-border bg-[#faf7f2]">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Email</th>
                    <th className={th}>Phone</th>
                    <th className={th}>Preferred</th>
                    <th className={th}>Message</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-brand-border last:border-0">
                      <td className={`${td} font-semibold`}>{b.name}</td>
                      <td className={td}>{b.email}</td>
                      <td className={td}>{b.phone}</td>
                      <td className={td}>{b.preferred_time}</td>
                      <td className={`${td} max-w-[320px]`}>{b.message}</td>
                      <td className={td}>
                        {b.plan_id ? (
                          <Link to={`/plan/${b.plan_id}`} className="font-semibold text-brand-ocean underline">
                            view
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead className="border-b border-brand-border bg-[#faf7f2]">
                  <tr>
                    <th className={th}>Business</th>
                    <th className={th}>Email</th>
                    <th className={th}>Team</th>
                    <th className={th}>Budget</th>
                    <th className={th}>Headline</th>
                    <th className={th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b border-brand-border last:border-0">
                      <td className={`${td} font-semibold`}>{p.business_type}</td>
                      <td className={td}>{p.email}</td>
                      <td className={td}>{p.team_size}</td>
                      <td className={td}>{p.budget}</td>
                      <td className={`${td} max-w-[360px]`}>
                        <Link to={`/plan/${p.id}`} className="font-semibold text-brand-ocean underline">
                          {p.headline || "view plan"}
                        </Link>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      )}
    </PageShell>
  );
}
