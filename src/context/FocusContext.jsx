import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { PlanContext } from "./PlanContext.jsx";
import { saveFocusSession } from "../services/focusService.js";
import { friendlyError } from "../lib/authErrors.js";

// FOCUS TIMER (Feature 13). It lives here (not inside the Focus page) so the timer
// keeps running when the student opens another page. It uses the real end time
// (not a counter), so it stays correct even if the browser slows down background tabs.
// The running timer is also kept in localStorage, so a page refresh does not lose it.
const FocusContext = createContext(null);

const storageKey = (uid) => `schedmind.focus.${uid}`;
const MAX_AWAY_MS = 5 * 60000; // a timer that ended more than 5 min ago while the app was closed is NOT credited

function loadTimer(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(uid)));
    if (saved && (saved.status === "running" || saved.status === "paused")) {
      if (saved.status === "running" && Date.now() - saved.endAt > MAX_AWAY_MS) {
        return { timer: { status: "idle" }, lost: true };
      }
      return { timer: saved, lost: false };
    }
  } catch {
    // ignore broken or blocked storage
  }
  return { timer: { status: "idle" }, lost: false };
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  } catch {
    // sound is optional
  }
}

export function FocusProvider({ children }) {
  const { user } = useAuth();
  const plan = useContext(PlanContext);
  const tasks = plan?.tasks || [];

  const [initial] = useState(() => loadTimer(user.uid));
  const [timer, setTimer] = useState(initial.timer);
  const [result, setResult] = useState(
    initial.lost ? { type: "info", text: "Your timer ended while SchedMind was closed, so it was not saved." } : null
  );
  const [saving, setSaving] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const finishing = useRef(false);

  // Keep the timer in localStorage.
  useEffect(() => {
    try {
      if (timer.status === "idle") localStorage.removeItem(storageKey(user.uid));
      else localStorage.setItem(storageKey(user.uid), JSON.stringify(timer));
    } catch {
      // ignore
    }
  }, [timer, user.uid]);

  // Tick twice a second while running.
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.status]);

  const remainingMs =
    timer.status === "running" ? Math.max(0, timer.endAt - tick) : timer.status === "paused" ? timer.remainingMs : 0;
  const elapsedMs = timer.status === "idle" ? 0 : timer.plannedMs - remainingMs;

  // Save the session and go back to idle.
  const finish = useCallback(
    async (completed) => {
      if (finishing.current || timer.status === "idle") return;
      finishing.current = true;
      const now = Date.now();
      const remaining = timer.status === "running" ? Math.max(0, timer.endAt - now) : timer.remainingMs;
      const minutes = completed ? timer.plannedMinutes : Math.floor((timer.plannedMs - remaining) / 60000);

      setTimer({ status: "idle" });
      if (minutes < 1) {
        setResult({ type: "info", text: "That was under 1 minute, so it was not saved." });
        finishing.current = false;
        return;
      }
      setSaving(true);
      try {
        await saveFocusSession({
          uid: user.uid,
          task: tasks.find((t) => t.id === timer.taskId) || null,
          minutes,
          plannedMinutes: timer.plannedMinutes,
          startedAt: timer.startedAt,
          endedAt: now,
          completed,
        });
        if (completed) beep();
        setResult({
          type: "success",
          text: completed
            ? `Session complete! ${minutes} minutes saved${timer.taskTitle ? ` to “${timer.taskTitle}”` : ""}.`
            : `Saved ${minutes} minute${minutes === 1 ? "" : "s"} of focus time.`,
        });
      } catch (err) {
        setResult({ type: "error", text: `Could not save the session: ${friendlyError(err) || "unknown error"}` });
      } finally {
        setSaving(false);
        finishing.current = false;
      }
    },
    [timer, tasks, user.uid]
  );

  // Time is up -> complete automatically.
  useEffect(() => {
    if (timer.status === "running" && tick >= timer.endAt) finish(true);
  }, [timer, tick, finish]);

  // Show the countdown in the browser tab title.
  useEffect(() => {
    if (timer.status !== "running") return;
    const original = document.title;
    const m = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
    const s = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");
    document.title = `${m}:${s} · Focus`;
    return () => {
      document.title = original;
    };
  }, [timer.status, remainingMs]);

  const start = useCallback(({ taskId, taskTitle, minutes }) => {
    const now = Date.now();
    const plannedMs = minutes * 60000;
    setResult(null);
    setTick(now);
    setTimer({ status: "running", taskId: taskId || null, taskTitle: taskTitle || "", plannedMinutes: minutes, plannedMs, startedAt: now, endAt: now + plannedMs });
  }, []);

  const pause = useCallback(() => {
    if (timer.status !== "running") return;
    setTimer({ ...timer, status: "paused", remainingMs: Math.max(0, timer.endAt - Date.now()) });
  }, [timer]);

  const resume = useCallback(() => {
    if (timer.status !== "paused") return;
    const now = Date.now();
    setTick(now);
    setTimer({ ...timer, status: "running", endAt: now + timer.remainingMs });
  }, [timer]);

  // Reset throws the session away (nothing is saved).
  const reset = useCallback(() => {
    setTimer({ status: "idle" });
    setResult(null);
  }, []);

  const value = {
    timer,
    remainingMs,
    elapsedMs,
    saving,
    result,
    clearResult: () => setResult(null),
    start,
    pause,
    resume,
    reset,
    finishEarly: () => finish(false),
  };
  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside <FocusProvider>.");
  return ctx;
}
