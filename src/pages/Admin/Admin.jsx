import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, ListChecks, RefreshCw, ShieldCheck, Timer, Users } from "lucide-react";
import { loadAdminData } from "../../services/adminService.js";
import { computeAdminStats } from "../../lib/adminStats.js";
import { friendlyError } from "../../lib/authErrors.js";
import { fmtMin } from "../../lib/plan/format.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

// ADMIN DASHBOARD (Feature 14). Read-only overview. The route is admin-only AND
// Firestore rules refuse these reads for anyone who is not an admin.
export default function Admin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loadAdminData());
    } catch (err) {
      setError(friendlyError(err) || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(
    () => (data ? computeAdminStats({ ...data, now: new Date() }) : null),
    [data]
  );

  const rows = stats
    ? stats.rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><ShieldCheck size={24} className="text-brand-600" /> Admin</h1>
          <p className="text-sm text-ink-500">Read-only overview. Task titles and notes are never shown here.</p>
        </div>
        <div className="w-36"><Button variant="outline" onClick={load} loading={loading}><RefreshCw size={16} /> Refresh</Button></div>
      </div>

      <div className="mt-4 space-y-3">
        <Alert type="error">{error}</Alert>
        {data?.truncated && <Alert type="info">Showing the first 2,000 records of each type.</Alert>}
      </div>

      {loading && !data ? <Spinner label="Loading admin data..." /> : stats && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Users} color="bg-brand-500" value={stats.studentCount} label={`Students (${stats.activeThisWeek} active this week)`} />
            <Stat icon={ListChecks} color="bg-accent-blue" value={stats.totals.tasks} label={`Tasks (${stats.totals.overdue} overdue)`} />
            <Stat icon={CheckCircle2} color="bg-accent-purple" value={`${stats.totals.completionPercent}%`} label="Tasks completed" />
            <Stat icon={Timer} color="bg-accent-orange" value={fmtMin(stats.totals.focusMinutes)} label="Total focus time" />
          </div>

          <section className="mt-6 rounded-3xl bg-surface p-5 shadow-card" aria-label="New sign-ups">
            <h2 className="font-bold">New sign-ups (8 weeks)</h2>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.signups} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="count" name="Sign-ups" fill="#2dc4b2" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-6" aria-label="Users">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold">Users ({rows.length})</h2>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email"
                aria-label="Search users" className="h-10 w-full rounded-xl border border-ink-100 bg-surface px-3 text-sm sm:w-64" />
            </div>
            {rows.length === 0 ? (
              <EmptyState icon={Users} title="No users found" text={search ? "Try a different search." : "No accounts yet."} />
            ) : (
              <div className="overflow-x-auto rounded-3xl bg-surface shadow-card">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Joined</th>
                      <th className="p-3 text-right">Tasks</th><th className="p-3 text-right">Done</th>
                      <th className="p-3 text-right">Overdue</th><th className="p-3 text-right">Focus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.uid} className="border-b border-ink-100 last:border-0">
                        <td className="p-3"><p className="font-semibold">{r.name}</p><p className="text-xs text-ink-500">{r.email}</p></td>
                        <td className="p-3">{r.role}</td>
                        <td className="p-3">{r.createdAt ? format(r.createdAt, "MMM d, yyyy") : "-"}</td>
                        <td className="p-3 text-right">{r.tasks}</td>
                        <td className="p-3 text-right">{r.done}</td>
                        <td className={`p-3 text-right ${r.overdue ? "font-semibold text-danger" : ""}`}>{r.overdue}</td>
                        <td className="p-3 text-right">{fmtMin(r.focusMinutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, color, value, label }) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}><Icon size={20} /></div>
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}
