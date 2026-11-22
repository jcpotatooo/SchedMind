import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { ArrowLeft, LifeBuoy, ShieldCheck } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { generateSchedule } from "../../lib/plan/scheduler.js";
import { buildSlots } from "../../lib/plan/time.js";
import { remainingWork } from "../../lib/plan/workload.js";
import { fmtMin, timeText } from "../../lib/plan/format.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

const EXTRA_OPTIONS = [0, 30, 60, 120];
const DAY_MS = 86400000;

// DEADLINE RESCUE MODE (Feature 5): review the problem, preview a recovery plan, accept it.
export default function Rescue() {
  const navigate = useNavigate();
  const {
    tasks, loading, settings, behavior, riskById, rescue, mode, extraMinutes: activeExtra,
    schedule, sessions, applyGenerated, endRescue,
  } = usePlan();

  const [extra, setExtra] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The proposed plan (NOT saved until the student accepts it).
  const proposal = useMemo(
    () => generateSchedule({ tasks, settings, behavior, now: new Date(), mode: "rescue", extraMinutes: extra, existingSessions: sessions }),
    [tasks, settings, behavior, extra, sessions]
  );
  const current = useMemo(
    () => generateSchedule({ tasks, settings, behavior, now: new Date(), mode: "normal", extraMinutes: activeExtra, existingSessions: sessions }),
    [tasks, settings, behavior, activeExtra, sessions]
  );

  const workload = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done");
    const needed = open.reduce((sum, t) => sum + remainingWork(t, behavior).remaining, 0);
    const horizon = Date.now() + 7 * DAY_MS;
    const available = buildSlots(settings, new Date(), extra).filter((s) => s.end <= horizon).length * 30;
    return { needed, available };
  }, [tasks, behavior, settings, extra]);

  const shortBefore = current.unscheduled.reduce((s, u) => s + u.shortfall, 0);
  const shortAfter = proposal.unscheduled.reduce((s, u) => s + u.shortfall, 0);

  const groups = useMemo(() => {
    const out = [];
    proposal.sessions.forEach((s) => {
      const key = format(s.start, "yyyy-MM-dd");
      const last = out[out.length - 1];
      const d = new Date(s.start);
      const label = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE, MMM d");
      if (last && last.key === key) last.items.push(s);
      else out.push({ key, label, items: [s] });
    });
    return out.slice(0, 7);
  }, [proposal]);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await applyGenerated(proposal, {
        mode: "rescue",
        extraMinutes: extra,
        reasons: [`Rescue plan accepted${extra ? ` with +${extra} minutes per study day` : ""}.`],
      });
      navigate("/schedule");
    } catch (err) {
      setError(friendlyError(err) || "Could not save the rescue plan.");
      setBusy(false);
    }
  }

  async function leaveRescue() {
    setBusy(true);
    try {
      await endRescue();
      navigate("/schedule");
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  const back = (
    <Link to="/schedule" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-600">
      <ArrowLeft size={16} /> Back to schedule
    </Link>
  );

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-6"><Spinner label="Checking your deadlines..." /></div>;

  // Not behind: say so (and let the student leave an active rescue plan).
  if (!rescue.needed) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {back}
        <EmptyState icon={ShieldCheck} title="You're on track"
          text="No overdue tasks, no high-risk deadlines and no repeated missed sessions. Rescue Mode turns on when you fall behind."
          action={mode === "rescue" && <Button loading={busy} onClick={leaveRescue} className="px-6">End Rescue Mode</Button>} />
        <div className="mt-4"><Alert type="error">{error}</Alert></div>
      </div>
    );
  }

  const taskTitle = (id) => tasks.find((t) => t.id === id)?.title || "Task";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {back}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700"><LifeBuoy size={22} /></div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Deadline Rescue Mode</h1>
          <p className="text-sm text-ink-500">Review what is behind, preview a recovery plan, then accept it.</p>
        </div>
      </div>

      {/* 1. What is wrong */}
      <section className="mt-6 rounded-3xl bg-surface p-5 shadow-card" aria-label="What is behind">
        <h2 className="font-bold">1. What needs rescuing</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {rescue.overdue.map((t) => (
            <li key={t.id} className="rounded-xl bg-red-50 p-3 text-red-700">
              <strong>{t.title}</strong> is overdue by {timeText(t.deadline.getTime() - Date.now())}.
            </li>
          ))}
          {rescue.highRisk.map((t) => (
            <li key={t.id} className="rounded-xl bg-amber-50 p-3 text-amber-800">
              <strong>{t.title}</strong>: {riskById[t.id].explanation}
            </li>
          ))}
          {rescue.recentMissed >= 2 && (
            <li className="rounded-xl bg-amber-50 p-3 text-amber-800">
              You missed {rescue.recentMissed} study sessions in the last 3 days.
            </li>
          )}
        </ul>
        <p className="mt-3 text-sm text-ink-700">
          Work left: about <strong>{fmtMin(workload.needed)}</strong>. Study time in the next 7 days:
          about <strong>{fmtMin(workload.available)}</strong>. Due within 3 days: <strong>{rescue.dueSoon.length}</strong> task{rescue.dueSoon.length === 1 ? "" : "s"}.
        </p>
      </section>

      {/* 2. Choose extra time */}
      <section className="mt-5 rounded-3xl bg-surface p-5 shadow-card" aria-label="Extra study time">
        <h2 className="font-bold">2. Extra study time per study day</h2>
        <p className="text-xs text-ink-500">Extends the end of each study day. Choose only what you can really do.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXTRA_OPTIONS.map((m) => (
            <button key={m} type="button" aria-pressed={extra === m} onClick={() => setExtra(m)}
              className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${
                extra === m ? "bg-brand-500 text-white shadow-card" : "bg-page text-ink-700 hover:bg-ink-100/60"
              }`}>
              {m === 0 ? "None" : `+${m} min`}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Proposed plan */}
      <section className="mt-5 rounded-3xl bg-surface p-5 shadow-card" aria-label="Proposed plan">
        <h2 className="font-bold">3. Proposed recovery plan</h2>
        <p className="text-xs text-ink-500">Ordered: overdue first, then nearest deadline first.</p>

        <p className="mt-3 rounded-xl bg-page p-3 text-sm text-ink-700">
          Work that does not fit: <strong>{fmtMin(shortBefore)}</strong> now → <strong>{fmtMin(shortAfter)}</strong> with this plan.
        </p>

        {proposal.unscheduled.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-semibold">Still cannot be finished in time:</p>
            <ul className="mt-1 list-disc pl-5">
              {proposal.unscheduled.map((u) => (
                <li key={u.taskId}>“{taskTitle(u.taskId)}”: short by about {fmtMin(u.shortfall)}. Consider asking for an extension or reducing the scope.</li>
              ))}
            </ul>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No free study time was found. Add study hours in Settings.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {groups.map((g) => (
              <div key={g.key}>
                <h3 className="mb-1 text-sm font-bold text-ink-700">{g.label}</h3>
                <ul className="space-y-1.5">
                  {g.items.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3 rounded-xl bg-page px-3 py-2 text-sm">
                      <span className="truncate font-medium">{s.taskTitle}</span>
                      <span className="shrink-0 text-ink-500">{format(s.start, "h:mm a")} – {format(s.end, "h:mm a")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs text-ink-500">Showing the first 7 days of the plan.</p>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <Alert type="error">{error}</Alert>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate("/schedule")} disabled={busy}>Not now</Button>
            <Button onClick={accept} loading={busy} disabled={groups.length === 0}>
              {schedule ? "Accept this plan" : "Accept and create schedule"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
