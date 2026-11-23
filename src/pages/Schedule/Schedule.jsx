import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { TriangleAlert, CalendarDays, Check, CheckCircle2, ListChecks, RotateCcw, Sparkles, X } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { setSessionStatus } from "../../services/scheduleService.js";
import { updateTask } from "../../services/taskService.js";
import { friendlyError } from "../../lib/authErrors.js";
import { fmtMin, getSessionPartInfo } from "../../lib/plan/format.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
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
    ranking, riskById, rescue, now, mode, extraMinutes, usingDefaultSettings, regenerate, regenerateWithAI, aiInfo, endRescue,
  } = usePlan();

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [openWhy, setOpenWhy] = useState(null);
  const [taskPrompt, setTaskPrompt] = useState(null);

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

  // AI-assisted generation. If the AI is unavailable, the rule-based schedule is created
  // instead and the reason (including the error code) is shown.
  async function runAI() {
    setBusy(true);
    try {
      const result = await regenerateWithAI();
      setNotice(
        result.usedAI
          ? { type: "success", text: "AI-optimized schedule created." }
          : { type: "info", text: `The AI was unavailable (${result.error}). A rule-based schedule was created instead.` }
      );
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(session, status) {
    try {
      const task = tasks.find((t) => t.id === session.taskId);
      await setSessionStatus({
        uid: user.uid,
        schedule,
        session,
        status,
        task,
      });

      if (status === "done") {
        setNotice({
          type: "success",
          text: `“${session.taskTitle}” study session marked as Done.`,
          undoSession: session,
        });

        // Prompt completion if this session was marked done and no more planned sessions remain for this task
        if (task && task.status !== "done") {
          const remainingPlanned = sessions.filter(
            (s) => s.taskId === session.taskId && s.id !== session.id && s.status === "planned"
          );
          if (remainingPlanned.length === 0) {
            setTaskPrompt(task);
          }
        }
      } else if (status === "planned") {
        setNotice({ type: "success", text: `Session restored to your schedule.` });
      }
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) || "Could not update the session." });
    }
  }

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const openTaskIds = useMemo(() => new Set(openTasks.map((t) => t.id)), [openTasks]);

  // Active upcoming study sessions from today onward:
  // 1. Belong to an unfinished task (tasks marked Done in the task bar are NEVER shown in upcoming schedule)
  // 2. By default, completed sessions disappear so only remaining study sessions are shown.
  // 3. User can toggle "Show completed" to review or undo finished sessions.
  const { days, completedCount } = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();

    // Only sessions for active, unfinished tasks
    const relevant = sessions.filter((s) => openTaskIds.has(s.taskId) && s.end >= todayStart);
    const planned = relevant.filter((s) => s.status === "planned");
    const completed = relevant.filter((s) => s.status === "done");

    const toShow = showCompleted ? relevant : planned;
    const sorted = [...toShow].sort((a, b) => a.start - b.start);

    const groups = [];
    sorted.forEach((s) => {
      const key = format(s.start, "yyyy-MM-dd");
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(s);
      else groups.push({ key, label: dayLabel(s.start), items: [s] });
    });

    return { days: groups, completedCount: completed.length };
  }, [sessions, openTaskIds, showCompleted]);

  // Tasks that are NOT marked Done but whose planned study time is already used up
  // (studied >= estimate + the one extra reserve). They have no sessions left, so tell the student why.
  const plannedTaskIds = new Set(sessions.filter((s) => s.status === "planned" && s.end > now.getTime()).map((s) => s.taskId));
  const usedUp = ranking.filter((i) => i.work.remaining === 0 && (i.task.studiedMinutes || 0) > 0 && !plannedTaskIds.has(i.task.id));

  const shownDays = showAll ? days : days.slice(0, 7);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Smart Schedule</h1>
          <p className="text-sm text-ink-500">
            Study sessions planned from your deadlines, priorities and free hours
            {mode === "rescue" && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Rescue Mode</span>}
          </p>
        </div>
        {schedule && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={runAI} disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600 disabled:opacity-60">
              <Sparkles size={16} /> {busy ? "Working..." : "Generate with AI"}
            </button>
            <button type="button" onClick={() => run(regenerate, "Schedule regenerated (rules only).")} disabled={busy}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold transition hover:bg-page disabled:opacity-60">
              <RotateCcw size={16} /> Rules only
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {notice && (
          <Alert type={notice.type || "info"}>
            <div className="flex w-full items-center justify-between gap-3">
              <span>{notice.text}</span>
              {notice.undoSession && (
                <button
                  type="button"
                  onClick={() => {
                    changeStatus(notice.undoSession, "planned");
                    setNotice(null);
                  }}
                  className="shrink-0 font-bold underline hover:opacity-80"
                >
                  Undo
                </button>
              )}
            </div>
          </Alert>
        )}
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
            action={
              <div className="flex flex-col items-center gap-2">
                <Button loading={busy} onClick={runAI} className="px-6"><Sparkles size={16} /> Generate with AI</Button>
                <button type="button" disabled={busy} onClick={() => run(regenerate, "Your schedule is ready.")}
                  className="text-sm font-semibold text-ink-500 underline">Without AI (rules only)</button>
              </div>} />
        ) : (
          <>
            {aiInfo?.used ? (
              <div className="mb-4 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">
                <p className="flex items-center gap-2 font-semibold"><Sparkles size={16} /> AI-optimized schedule</p>
                {aiInfo.summary && <p className="mt-1">{aiInfo.summary}</p>}
                <p className="mt-1 text-xs text-ink-500">
                  The AI ({aiInfo.model || "Gemini"}) advises on priority and time needed. SchedMind's planner then places every session,
                  so sessions never overlap, stay inside your study hours and finish before deadlines.
                </p>
              </div>
            ) : (
              <p className="mb-4 text-xs text-ink-500">This schedule uses SchedMind's rule-based planner. Press “Generate with AI” for AI advice.</p>
            )}

            {usedUp.length > 0 && (
              <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <CheckCircle2 size={18} className="shrink-0 text-blue-600" />
                  <span>Planned study time used up</span>
                </div>
                <p className="mt-1 text-xs text-blue-700">
                  You completed all planned study time for the following task{usedUp.length > 1 ? "s" : ""}. If finished, mark done right here:
                </p>
                <div className="mt-3 space-y-2">
                  {usedUp.map((i) => (
                    <div
                      key={i.task.id}
                      className="flex flex-col gap-2 rounded-xl bg-white/90 p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">“{i.task.title}”</p>
                        <p className="text-xs text-ink-500">
                          Studied {fmtMin(i.task.studiedMinutes)} (covers {fmtMin(i.task.estimatedMinutes)} estimate + extra reserve)
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await updateTask(i.task, { status: "done" });
                              setNotice({ type: "success", text: `“${i.task.title}” marked as Done.` });
                            } catch (err) {
                              setNotice({ type: "error", text: friendlyError(err) });
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-500 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-brand-600 disabled:opacity-50"
                        >
                          <Check size={14} /> Mark Task Done
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              const newEst = (i.task.estimatedMinutes || 0) + 30;
                              await updateTask(i.task, { estimatedMinutes: newEst });
                              setNotice({ type: "success", text: `Added 30 min to “${i.task.title}”. Schedule will add sessions.` });
                            } catch (err) {
                              setNotice({ type: "error", text: friendlyError(err) });
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-medium text-ink-700 transition hover:bg-page disabled:opacity-50"
                          title="Add 30 minutes to task estimate"
                        >
                          +30 min
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {completedCount > 0 && (
              <div className="mb-4 flex items-center justify-between rounded-2xl border border-ink-100 bg-surface px-4 py-2.5 text-xs text-ink-500 shadow-xs">
                <span>
                  {completedCount} completed study session{completedCount === 1 ? "" : "s"} {showCompleted ? "shown" : "hidden"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {showCompleted ? "Hide completed" : "Show completed"}
                </button>
              </div>
            )}

            {shownDays.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={completedCount > 0 ? "All scheduled sessions completed!" : "No upcoming sessions"}
                text={
                  completedCount > 0
                    ? `You completed all ${completedCount} study session${completedCount === 1 ? "" : "s"} planned for today and tomorrow. Great work!`
                    : "No free study time is left before your deadlines. Check your study hours in Settings."
                }
                action={
                  completedCount > 0 && !showCompleted ? (
                    <button
                      type="button"
                      onClick={() => setShowCompleted(true)}
                      className="inline-flex h-10 items-center rounded-xl bg-brand-50 px-4 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                    >
                      View completed sessions
                    </button>
                  ) : (
                    <Link to="/settings" className="font-semibold text-brand-600">Open Settings</Link>
                  )
                }
              />
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
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-semibold">{s.taskTitle}</p>
                                {(() => {
                                  const partInfo = getSessionPartInfo(s, sessions);
                                  return partInfo && partInfo.total > 1 ? (
                                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                                      Part {partInfo.part} of {partInfo.total}
                                    </span>
                                  ) : null;
                                })()}
                                {s.ai && <span className="rounded-full bg-brand-50 px-2 py-0.5 align-middle text-[10px] font-bold text-brand-700">AI</span>}
                              </div>
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

      {taskPrompt && (
        <Modal title="Task study time finished!" onClose={() => setTaskPrompt(null)}>
          <p className="text-sm text-ink-700">
            You just completed all scheduled study sessions for <strong>“{taskPrompt.title}”</strong> ({fmtMin(taskPrompt.studiedMinutes || 0)} studied).
            Have you finished this task?
          </p>
          <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setTaskPrompt(null)}>
              Not yet (keep In Progress)
            </Button>
            <Button
              onClick={async () => {
                const t = taskPrompt;
                setTaskPrompt(null);
                setBusy(true);
                try {
                  await updateTask(t, { status: "done" });
                  setNotice({ type: "success", text: `“${t.title}” marked as Done.` });
                } catch (err) {
                  setNotice({ type: "error", text: friendlyError(err) });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={16} /> Yes, mark Task as Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
