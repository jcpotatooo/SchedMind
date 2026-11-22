import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Clock, Flame, LifeBuoy, ListChecks, Plus, Target, Timer } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { PriorityChip } from "../../components/plan/Chips.jsx";
import { greeting } from "../../lib/dashboardStats.js";
import { computeProgress } from "../../lib/activity.js";
import { habitStats } from "../../lib/habits.js";
import { isOverdue, statusInfo } from "../../lib/taskConstants.js";
import { fmtMin } from "../../lib/plan/format.js";
import Alert from "../../components/ui/Alert.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

const COLORS = { done: "#2dc4b2", inProgress: "#3b6fd8", todo: "#e2e8f0" };

export default function Dashboard() {
  const { displayName } = useAuth();
  const { tasks, loading, error, ranking, rescue, sessions, focusSessions, habits, habitLogs, now } = usePlan();
  const progress = useMemo(() => computeProgress({ tasks, focusSessions, sessions, now }), [tasks, focusSessions, sessions, now]);
  const hs = useMemo(() => habitStats(habits, habitLogs, now), [habits, habitLogs, now]);
  // Shape used by the cards and charts below (all from real records).
  const stats = {
    total: progress.counts.total, doneCount: progress.counts.done, inProgressCount: progress.counts.inProgress,
    todoCount: progress.counts.todo, completionPercent: progress.completionPercent, week: progress.week,
    weekTotal: progress.weekTasksDone,
  };

  // Upcoming = unfinished tasks ranked by the smart priority score (not just deadline).
  const upcoming = ranking.slice(0, 5);
  // Next planned study session that has not ended yet.
  const nextSession = [...sessions]
    .filter((s) => s.status === "planned" && s.end > now.getTime())
    .sort((a, b) => a.start - b.start)[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {greeting(now)}, {displayName.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-sm text-ink-500">{format(now, "EEEE, MMMM d")}</p>

      <div className="mt-4"><Alert type="error">{error}</Alert></div>

      {loading ? (
        <Spinner label="Loading your dashboard..." />
      ) : (
        <>
          {/* Statistic cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={ListChecks} color="bg-brand-500" value={stats.doneCount} label="Tasks done" />
            <StatCard icon={Target} color="bg-accent-blue" value={`${hs.doneToday}/${hs.total}`} label="Habits today" />
            <StatCard icon={Timer} color="bg-accent-purple" value={progress.weekFocusMinutes} label="Focus mins (7 days)" />
            <StatCard icon={Flame} color="bg-accent-orange" value={`${progress.streak.current}d`} label="Study streak" />
          </div>

          {rescue.needed && (
            <Link to="/rescue" className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 transition hover:bg-red-100">
              <LifeBuoy size={20} className="mt-0.5 shrink-0" />
              <span>
                <strong>You may be falling behind.</strong>{" "}
                {[
                  rescue.overdue.length && `${rescue.overdue.length} overdue`,
                  rescue.highRisk.length && `${rescue.highRisk.length} high-risk`,
                  rescue.recentMissed >= 2 && `${rescue.recentMissed} missed sessions`,
                ].filter(Boolean).join(", ")}. Open Rescue Mode.
              </span>
            </Link>
          )}

          {nextSession && (
            <Link to="/schedule" className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card transition hover:shadow-soft">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CalendarDays size={20} /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Next study session</p>
                <p className="truncate font-semibold">{nextSession.taskTitle}</p>
                <p className="text-xs text-ink-500">
                  {format(nextSession.start, "EEE, MMM d · h:mm a")} · {fmtMin(nextSession.minutes)}
                </p>
              </div>
            </Link>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            {/* Weekly chart */}
            <section className="rounded-3xl bg-surface p-5 shadow-card lg:col-span-3" aria-label="This week">
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">This Week</h2>
                <span className="text-xs text-ink-500">{stats.weekTotal} tasks done</span>
              </div>
              <p className="text-xs text-ink-500">Study minutes and tasks completed per day</p>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.week} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="studyMinutes" name="Study minutes" fill={COLORS.done} radius={[6, 6, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="tasksDone" name="Tasks done" fill={COLORS.inProgress} radius={[6, 6, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {stats.weekTotal === 0 && progress.week.every((d) => d.studyMinutes === 0) && (
                <p className="mt-2 text-center text-xs text-ink-500">
                  No activity in the last 7 days yet. Finish a focus session or mark a task Done.
                </p>
              )}
            </section>

            {/* Completion donut */}
            <section className="rounded-3xl bg-surface p-5 shadow-card lg:col-span-2" aria-label="Task completion">
              <h2 className="font-bold">Task Completion</h2>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.total
                          ? [
                              { name: "Done", value: stats.doneCount, color: COLORS.done },
                              { name: "In Progress", value: stats.inProgressCount, color: COLORS.inProgress },
                              { name: "To Do", value: stats.todoCount, color: COLORS.todo },
                            ]
                          : [{ name: "No tasks", value: 1, color: COLORS.todo }]}
                        dataKey="value" innerRadius={42} outerRadius={60} stroke="none" startAngle={90} endAngle={-270}>
                        {(stats.total
                          ? [COLORS.done, COLORS.inProgress, COLORS.todo]
                          : [COLORS.todo]
                        ).map((c) => <Cell key={c} fill={c} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-extrabold">{stats.completionPercent}%</span>
                    <span className="text-[10px] text-ink-500">done</span>
                  </div>
                </div>
                <dl className="flex-1 space-y-2 text-sm">
                  <LegendRow color="bg-brand-500" label="Done" value={stats.doneCount} />
                  <LegendRow color="bg-accent-blue" label="In Progress" value={stats.inProgressCount} />
                  <LegendRow color="bg-ink-100" label="To Do" value={stats.todoCount} />
                  <div className="flex justify-between border-t border-ink-100 pt-2 font-medium">
                    <dt className="text-ink-500">Total</dt>
                    <dd>{stats.total}</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>

          {/* Upcoming tasks */}
          <section className="mt-6" aria-label="Upcoming tasks">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Upcoming Tasks</h2>
              <Link to="/tasks" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View all</Link>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={ListChecks}
                title={tasks.length ? "You're all caught up!" : "No tasks yet"}
                text={tasks.length ? "Every task is done. Nice work." : "Add your first task to see it here."}
                action={!tasks.length && (
                  <Link to="/tasks" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-card hover:bg-brand-600">
                    <Plus size={18} /> Add a task
                  </Link>
                )} />
            ) : (
              <div className="space-y-3">
                {upcoming.map(({ task, level }) => (
                  <Link key={task.id} to="/tasks"
                    className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card transition hover:shadow-soft">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${levelDot(level)}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{task.title}</p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                        <span>{task.category}{task.subject ? ` · ${task.subject}` : ""} · {statusInfo(task.status).label}</span>
                        <PriorityChip level={level} />
                      </p>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 text-xs ${isOverdue(task, now) ? "font-semibold text-danger" : "text-ink-500"}`}>
                      <Clock size={14} /> {format(task.deadline, "MMM d")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// Dot color = smart priority level (High red, Medium orange, Low teal).
function levelDot(level) {
  if (level === "High") return "bg-danger";
  if (level === "Medium") return "bg-accent-orange";
  return "bg-brand-500";
}

function StatCard({ icon: Icon, color, value, label }) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${color}`}>
        <Icon size={20} />
      </div>
      <p className="mt-3 text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-ink-700">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
      </dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
