import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { TriangleAlert, CalendarDays, Check, ListChecks, RotateCcw, Sparkles, X } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { setSessionStatus } from "../../services/scheduleService.js";
import { friendlyError } from "../../lib/authErrors.js";
import { fmtMin } from "../../lib/plan/format.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import PriorityList from "../../components/plan/PriorityList.jsx";
import BehaviorCard from "../../components/plan/BehaviorCard.jsx";
import ChangeLog from "../../components/plan/ChangeLog.jsx";

const STATUS_STYLE = {
  planned: "bg-page text-ink-700",
  done: "bg-brand-50 text-brand-700",
  missed: "bg-red-50 text-red-700",
};

function dayLabel(ms) {
  const d = new Date(ms);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE, MMM d");
}

export default function Schedule() {
  const { user } = useAuth();
  const {
    tasks, loading, error, schedule, scheduleLoading, scheduleError, sessions, behavior,
    ranking, riskById, rescue, mode, extraMinutes, usingDefaultSettings, regenerate, endRescue,
  } = usePlan();

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openWhy, setOpenWhy] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  async function run(action, successText) {
    setBusy(true);
    try {
      await action();
      setNotice({ type: "success", text: successText });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(session, status) {
    try {
      await setSessionStatus({
        uid: user.uid,
        schedule,
        session,
        status,
        task: tasks.find((t) => t.id === session.taskId),
      });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) || "Could not update the session." });
    }
  }

  // Sessions from today onward, grouped by day.
  const days = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const upcoming = sessions.filter((s) => s.end >= todayStart).sort((a, b) => a.start - b.start);
    const groups = [];
    upcoming.forEach((s) => {
      const key = format(s.start, "yyyy-MM-dd");
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(s);
      else groups.push({ key, label: dayLabel(s.start), items: [s] });
    });
    return groups;
  }, [sessions]);

  const shownDays = showAll ? days : days.slice(0, 7);
  const openTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Smart Schedule</h1>
          <p className="text-sm text-ink-500">
            Study sessions planned from your deadlines, priorities and free hours
            {mode === "rescue" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Rescue Mode</span>}
          </p>
        </div>
        {schedule && (
          <button type="button" onClick={() => run(regenerate, "Schedule regenerated.")} disabled={busy}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold transition hover:bg-page disabled:opacity-60">
            <RotateCcw size={16} /> Regenerate
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Alert type={notice?.type || "info"}>{notice?.text}</Alert>
        <Alert type="error">{error || scheduleError}</Alert>
        {usingDefaultSettings && (
          <Alert type="info">
            Using starting study hours. <Link to="/settings" className="font-semibold underline">Set your real hours</Link> for a better plan.
          </Alert>
        )}
      </div>

      {/* Rescue banner */}
      {rescue.needed && (
        <Link to="/rescue" className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700 transition hover:bg-red-100">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" />
          <span className="text-sm">
            <strong>You may be falling behind.</strong>{" "}
            {[
              rescue.overdue.length && `${rescue.overdue.length} overdue`,
              rescue.highRisk.length && `${rescue.highRisk.length} high-risk`,
              rescue.recentMissed >= 2 && `${rescue.recentMissed} missed sessions`,
            ].filter(Boolean).join(", ")}. Open Deadline Rescue Mode to build a recovery plan.
          </span>
        </Link>
      )}

      <div className="mt-6">
        {loading || scheduleLoading ? (
          <Spinner label="Loading your schedule..." />
        ) : openTasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="Nothing to schedule"
            text="Add a task with a deadline and SchedMind will plan your study sessions."
            action={<Link to="/tasks" className="inline-flex h-11 items-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-card hover:bg-brand-600">Go to Tasks</Link>} />
        ) : !schedule ? (
          <EmptyState icon={Sparkles} title="Create your first schedule"
            text={`You have ${openTasks.length} unfinished task${openTasks.length === 1 ? "" : "s"}. SchedMind will fit study sessions into your free hours, most important first.`}
            action={<Button loading={busy} onClick={() => run(regenerate, "Your schedule is ready.")} className="px-6">Generate my schedule</Button>} />
        ) : (
          <>
            {schedule.unscheduled?.length > 0 && (
              <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Not enough study time for everything</p>
                <ul className="mt-1 list-disc pl-5">
                  {schedule.unscheduled.map((u) => (
                    <li key={u.taskId}>“{u.title}” is short by about {fmtMin(u.shortfall)}.</li>
                  ))}
                </ul>
                <p className="mt-1">Add study hours in Settings or try <Link to="/rescue" className="font-semibold underline">Rescue Mode</Link>.</p>
              </div>
            )}

            {shownDays.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming sessions"
                text="No free study time is left before your deadlines. Check your study hours in Settings."
                action={<Link to="/settings" className="font-semibold text-brand-600">Open Settings</Link>} />
            ) : (
              <div className="space-y-5">
                {shownDays.map((day) => (
                  <section key={day.key} aria-label={day.label}>
                    <h2 className="mb-2 text-sm font-bold text-ink-700">{day.label}</h2>
                    <ul className="space-y-2">
                      {day.items.map((s) => (
                        <li key={s.id} className="rounded-2xl bg-surface p-4 shadow-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{s.taskTitle}</p>
                              <p className="text-xs text-ink-500">
                                {format(s.start, "h:mm a")} – {format(s.end, "h:mm a")} · {fmtMin(s.minutes)} · {s.category}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[s.status]}`}>
                              {s.status}{s.autoMissed ? " (auto)" : ""}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {s.status === "planned" ? (
                              <>
                                <button type="button" onClick={() => changeStatus(s, "done")}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                                  <Check size={14} /> Done
                                </button>
                                <button type="button" onClick={() => changeStatus(s, "missed")}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100">
                                  <X size={14} /> Missed
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => changeStatus(s, "planned")}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-page px-3 text-xs font-semibold text-ink-700 hover:bg-ink-100/60">
                                <RotateCcw size={14} /> Undo
                              </button>
                            )}
                            <button type="button" onClick={() => setOpenWhy(openWhy === s.id ? null : s.id)}
                              aria-expanded={openWhy === s.id}
                              className="h-8 px-2 text-xs font-semibold text-brand-600">
                              {openWhy === s.id ? "Hide why" : "Why this session?"}
                            </button>
                          </div>
                          {openWhy === s.id && <p className="mt-2 rounded-xl bg-page p-3 text-sm text-ink-700">{s.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {days.length > 7 && (
                  <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "Show fewer days" : `Show all ${days.length} days`}
                  </Button>
                )}
                <p className="text-xs text-ink-500">
                  Tip: take a 5–10 minute break between sessions. Sessions that end 30 minutes ago and were not marked Done count as missed.
                </p>
              </div>
            )}

            {mode === "rescue" && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                <span>Rescue Mode is active{extraMinutes ? ` (+${extraMinutes} min per study day)` : ""}.</span>
                <button type="button" disabled={busy} onClick={() => run(endRescue, "Back to your normal schedule.")}
                  className="shrink-0 font-semibold underline disabled:opacity-60">End Rescue Mode</button>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && ranking.length > 0 && (
        <section className="mt-8" aria-label="Priorities and risks">
          <h2 className="mb-1 text-lg font-bold">Priorities &amp; deadline risks</h2>
          <p className="mb-3 text-xs text-ink-500">
            Score = 40% deadline urgency + 25% importance + 15% difficulty + 20% workload. Open “Why this rank?” for the details.
          </p>
          <PriorityList ranking={ranking} riskById={riskById} />
        </section>
      )}

      <div className="mt-8 space-y-6">
        <ChangeLog entries={schedule?.changeLog} />
        <BehaviorCard behavior={behavior} />
      </div>
    </div>
  );
}
