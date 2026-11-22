import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, Flame, Timer } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { computeProgress } from "../../lib/activity.js";
import { fmtMin } from "../../lib/plan/format.js";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

const axis = { fontSize: 12, fill: "#64748b" };

// PROGRESS TRACKING (Feature 10): every number is calculated from the student's real records.
export default function Progress() {
  const { tasks, loading, focusSessions, sessions, now } = usePlan();
  const p = useMemo(() => computeProgress({ tasks, focusSessions, sessions, now }), [tasks, focusSessions, sessions, now]);

  if (loading) return <Spinner label="Loading your progress..." />;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Progress</h1>
      <p className="text-sm text-ink-500">Study time counts focus sessions and planned sessions you marked Done.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={CheckCircle2} color="bg-brand-500" value={`${p.completionPercent}%`} label={`${p.counts.done} of ${p.counts.total} tasks done`} />
        <Stat icon={Clock} color="bg-accent-blue" value={fmtMin(p.totalStudyMinutes)} label="Total study time" />
        <Stat icon={Timer} color="bg-accent-purple" value={fmtMin(p.weekFocusMinutes)} label="Focus this week" />
        <Stat icon={Flame} color="bg-accent-orange" value={`${p.streak.current}d`} label={`Streak (best ${p.streak.best}d)`} />
      </div>

      <section className="mt-6 rounded-3xl bg-surface p-5 shadow-card" aria-label="Last 7 days">
        <h2 className="font-bold">Last 7 days</h2>
        <p className="text-xs text-ink-500">Minutes studied and tasks completed per day</p>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.week} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axis} />
              <Tooltip cursor={{ fill: "#f8fafc" }} />
              <Legend />
              <Bar dataKey="studyMinutes" name="Study minutes" fill="#2dc4b2" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="tasksDone" name="Tasks done" fill="#3b6fd8" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-surface p-5 shadow-card" aria-label="Weekly trend">
        <h2 className="font-bold">Weekly trend (8 weeks)</h2>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={p.weeks} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axis} />
              <Tooltip />
              <Line type="monotone" dataKey="studyMinutes" name="Study minutes" stroke="#2dc4b2" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl bg-surface p-5 shadow-card" aria-label="By category">
          <h2 className="font-bold">By category</h2>
          {p.counts.total === 0 ? (
            <p className="mt-3 text-sm text-ink-500">Add tasks to see your progress by category.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {p.byCategory.filter((c) => c.total > 0).map((c) => (
                <li key={c.category}>
                  <div className="flex justify-between text-sm"><span>{c.category}</span><span className="text-ink-500">{c.done}/{c.total}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round((c.done / c.total) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-surface p-5 shadow-card" aria-label="Estimate accuracy">
          <h2 className="font-bold">Estimated vs actual time</h2>
          {p.accuracy.length === 0 ? (
            <p className="mt-3 text-sm text-ink-500">Finish tasks after logging study time to compare your estimates with reality.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {p.accuracy.map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span className="truncate">{a.title}</span>
                  <span className="shrink-0 text-ink-500">{fmtMin(a.estimated)} → <strong className="text-ink-700">{fmtMin(a.actual)}</strong></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {p.counts.total === 0 && focusSessions.length === 0 && (
        <div className="mt-6"><EmptyState title="No activity yet" text="Add tasks and use the Focus Timer. Your charts fill in as you work." /></div>
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
