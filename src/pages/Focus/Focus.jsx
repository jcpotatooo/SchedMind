import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useFocus } from "../../context/FocusContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { dayKey } from "../../lib/activity.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import { controlClass } from "../../components/ui/Field.jsx";

const PRESETS = [15, 25, 45, 60];
const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function Focus() {
  const { timer, remainingMs, saving, result, clearResult, start, pause, resume, reset, finishEarly } = useFocus();
  const { tasks, focusSessions } = usePlan();

  const [minutes, setMinutes] = useState("25");
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState("");

  const openTasks = tasks.filter((t) => t.status !== "done");
  const idle = timer.status === "idle";

  function handleStart() {
    const value = Number(minutes);
    if (!Number.isInteger(value) || value < 5 || value > 180) {
      setError("Choose a whole number of minutes between 5 and 180.");
      return;
    }
    setError("");
    const task = openTasks.find((t) => t.id === taskId);
    start({ taskId: task?.id, taskTitle: task?.title, minutes: value });
  }

  const progress = idle ? 0 : 1 - remainingMs / timer.plannedMs;

  const { todayMinutes, recent } = useMemo(() => {
    const today = dayKey(new Date());
    const sorted = [...focusSessions].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return {
      todayMinutes: sorted.filter((f) => dayKey(f.startedAt) === today).reduce((s, f) => s + f.minutes, 0),
      recent: sorted.slice(0, 6),
    };
  }, [focusSessions]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Focus Timer</h1>
      <p className="text-sm text-ink-500">Study in a focused block. Finished sessions are saved to your progress.</p>

      <div className="mt-4 space-y-3">
        <Alert type={result?.type || "info"}>{result?.text}</Alert>
        {result && <button type="button" onClick={clearResult} className="text-xs font-semibold text-ink-500 underline">Dismiss</button>}
      </div>

      <section className="mt-5 flex flex-col items-center rounded-3xl bg-surface p-6 shadow-card" aria-label="Timer">
        <div className="relative h-56 w-56" role="timer" aria-live="off">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#2dc4b2" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.5s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-extrabold tabular-nums">
              {idle ? clock(Number(minutes || 0) * 60000) : clock(remainingMs)}
            </span>
            <span className="mt-1 max-w-[10rem] truncate text-xs text-ink-500">
              {idle ? "Ready" : timer.status === "paused" ? "Paused" : timer.taskTitle || "Focusing"}
            </span>
          </div>
        </div>

        {idle ? (
          <div className="mt-6 w-full space-y-4">
            <div>
              <label htmlFor="focus-task" className="mb-1.5 block text-sm font-semibold">What are you studying? (optional)</label>
              <select id="focus-task" value={taskId} onChange={(e) => setTaskId(e.target.value)} className={controlClass()}>
                <option value="">No specific task</option>
                {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink-500">Linked time counts as study time for that task.</p>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold">Length</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((m) => (
                  <button key={m} type="button" aria-pressed={Number(minutes) === m} onClick={() => setMinutes(String(m))}
                    className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${
                      Number(minutes) === m ? "bg-brand-500 text-white shadow-card" : "bg-page text-ink-700 hover:bg-ink-100/60"
                    }`}>
                    {m} min
                  </button>
                ))}
                <input type="number" min="5" max="180" aria-label="Custom minutes" value={minutes}
                  onChange={(e) => setMinutes(e.target.value)} className={`${controlClass(!!error)} w-24`} />
                <span className="text-sm text-ink-500">min</span>
              </div>
              <Alert type="error">{error}</Alert>
            </div>

            <Button onClick={handleStart} loading={saving}><Play size={18} /> Start focus session</Button>
          </div>
        ) : (
          <div className="mt-6 grid w-full grid-cols-3 gap-3">
            {timer.status === "running" ? (
              <Button variant="outline" onClick={pause}><Pause size={18} /> Pause</Button>
            ) : (
              <Button onClick={resume}><Play size={18} /> Resume</Button>
            )}
            <Button variant="outline" onClick={finishEarly} loading={saving}><Square size={16} /> Finish</Button>
            <Button variant="outline" onClick={reset}><RotateCcw size={16} /> Reset</Button>
            <p className="col-span-3 text-center text-xs text-ink-500">
              Finish saves the time you studied so far. Reset throws the session away.
            </p>
          </div>
        )}
      </section>

      <section className="mt-6" aria-label="Recent sessions">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">Recent sessions</h2>
          <span className="text-xs text-ink-500">Today: {todayMinutes} min</span>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-ink-500 shadow-card">No focus sessions yet. Start one above.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-sm shadow-card">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{f.taskTitle || "General study"}</p>
                  <p className="text-xs text-ink-500">{format(new Date(f.startedAt), "MMM d, h:mm a")}{f.completed ? "" : " · ended early"}</p>
                </div>
                <span className="shrink-0 font-semibold">{f.minutes} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
