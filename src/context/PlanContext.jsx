import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { useAuth } from "./AuthContext.jsx";
import { useTasks } from "../hooks/useTasks.js";
import { useUserCollection } from "../hooks/useUserCollection.js";
import { friendlyError } from "../lib/authErrors.js";
import { askScheduleAI } from "../services/aiService.js";
import { buildAIRequest, cleanHints } from "../lib/plan/aiHints.js";
import { saveSchedule } from "../services/scheduleService.js";
import { createNotifications } from "../services/notificationService.js";
import { buildNotifications } from "../lib/notifications.js";
import { normalizeSettings } from "../lib/plan/settings.js";
import { buildSlots, removeBlocked } from "../lib/plan/time.js";
import { computeBehavior } from "../lib/plan/behavior.js";
import { rankTasks } from "../lib/plan/priority.js";
import { assessRisks } from "../lib/plan/risk.js";
import { generateSchedule } from "../lib/plan/scheduler.js";
import { getRescueStatus } from "../lib/plan/rescue.js";
import {
  buildScheduleDoc,
  countMissed,
  describeChanges,
  markPastSessions,
  snapshotInputs,
} from "../lib/plan/adjust.js";

// PlanContext = everything the "intelligent" features need, calculated once
// and shared by every page: tasks, settings, schedule, behavior, priorities, risks.
// It also runs AUTOMATIC SCHEDULE ADJUSTMENT in the background.
const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { user, profile } = useAuth();
  const { tasks, loading: tasksLoading, error } = useTasks(user.uid);

  // Phase 4 data (each is a live list of this student's own documents).
  const { items: focusSessions } = useUserCollection("focusSessions", user.uid);
  const { items: habits } = useUserCollection("habits", user.uid);
  const { items: habitLogs } = useUserCollection("habitLogs", user.uid);
  const { items: goals } = useUserCollection("goals", user.uid);
  const { items: notifications, loading: notificationsLoading, error: notificationsError } = useUserCollection("notifications", user.uid);

  // Live schedule document (schedules/{uid})
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  useEffect(() => {
    return onSnapshot(
      doc(db, "schedules", user.uid),
      (snap) => {
        setSchedule(snap.exists() ? { ...snap.data(), sessions: snap.data().sessions || [] } : null);
        setScheduleError("");
        setScheduleLoading(false);
      },
      (err) => {
        setScheduleError(friendlyError(err));
        setScheduleLoading(false);
      }
    );
  }, [user.uid]);

  // The clock ticks every minute so overdue/risk/missed status stays fresh.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const settings = useMemo(() => normalizeSettings(profile?.settings), [profile?.settings]);
  const usingDefaultSettings = !profile?.settings;
  const sessions = useMemo(() => schedule?.sessions || [], [schedule]);
  const extraMinutes = schedule?.extraMinutes || 0;
  const mode = schedule?.mode || "normal";

  const behavior = useMemo(() => computeBehavior(tasks, sessions), [tasks, sessions]);
  const slots = useMemo(
    () => removeBlocked(buildSlots(settings, now, extraMinutes), sessions, now.getTime()),
    [settings, now, extraMinutes, sessions]
  );

  // AI advice saved with the schedule (null when the schedule is rule-based only).
  const aiInfo = schedule?.ai || null;
  const { ranking, priorityById } = useMemo(() => {
    const { list, byId } = rankTasks({ tasks, slots, behavior, now, hints: aiInfo?.hints });
    return { ranking: list, priorityById: byId };
  }, [tasks, slots, behavior, now, aiInfo]);
  const riskById = useMemo(() => assessRisks({ tasks, slots, behavior, now }), [tasks, slots, behavior, now]);
  const rescue = useMemo(() => getRescueStatus({ tasks, riskById, sessions, now }), [tasks, riskById, sessions, now]);

  // Save a freshly generated schedule (first schedule, regenerate, rescue plan, auto-adjust).
  const applyGenerated = useCallback(
    (gen, { mode: nextMode, extraMinutes: nextExtra, reasons, ai = null }) => {
      const data = buildScheduleDoc({
        tasks,
        settings,
        schedule,
        gen,
        mode: nextMode,
        extraMinutes: nextExtra,
        reasons,
        ai,
        now: new Date(),
      });
      return saveSchedule(user.uid, data);
    },
    [tasks, settings, schedule, user.uid]
  );

  const regenerate = useCallback(async () => {
    const gen = generateSchedule({ tasks, settings, behavior, now: new Date(), mode, extraMinutes, existingSessions: sessions });
    await applyGenerated(gen, {
      mode,
      extraMinutes,
      reasons: [schedule ? "You regenerated your schedule." : "Your first schedule was generated."],
    });
  }, [tasks, settings, behavior, mode, extraMinutes, schedule, sessions, applyGenerated]);

  // AI-assisted schedule (hybrid): the AI gives priority/time advice per task, the planner
  // places the sessions. If the AI is unavailable, the rule-based scheduler is used instead.
  const regenerateWithAI = useCallback(async () => {
    const nowDate = new Date();
    const aiSlots = removeBlocked(buildSlots(settings, nowDate, extraMinutes), sessions, nowDate.getTime());
    const base = rankTasks({ tasks, slots: aiSlots, behavior, now: nowDate });
    let ai = null;
    let error = "";
    try {
      if (base.list.length === 0) throw new Error("there are no unfinished tasks");
      const request = buildAIRequest({ ranking: base.list, settings, behavior, now: nowDate });
      const res = await askScheduleAI(request.context);
      const hints = cleanHints(res.hints, request.sent);
      if (Object.keys(hints).length === 0) throw new Error("the AI returned no usable decisions");
      ai = { used: true, model: res.model || "", generatedAt: nowDate.getTime(), summary: res.summary || "", hints };
    } catch (err) {
      error = err.message || "unknown error";
    }
    const gen = generateSchedule({ tasks, settings, behavior, now: new Date(), mode, extraMinutes, existingSessions: sessions, hints: ai?.hints });
    await applyGenerated(gen, {
      mode,
      extraMinutes,
      ai,
      reasons: [ai ? "You generated an AI-optimized schedule." : `AI was unavailable, so the rule-based scheduler was used (${error}).`],
    });
    return { usedAI: !!ai, error };
  }, [tasks, settings, behavior, mode, extraMinutes, sessions, applyGenerated]);

  const endRescue = useCallback(async () => {
    const gen = generateSchedule({ tasks, settings, behavior, now: new Date(), mode: "normal", extraMinutes: 0, existingSessions: sessions });
    await applyGenerated(gen, { mode: "normal", extraMinutes: 0, reasons: ["Rescue Mode ended. Back to your normal schedule."] });
  }, [tasks, settings, behavior, sessions, applyGenerated]);

  // ---- AUTOMATIC SCHEDULE ADJUSTMENT (Feature 6) ----
  // Whenever something the plan depends on changes (task added/edited/deleted, deadline,
  // study hours, missed session, task taking longer, new overdue task), re-plan and
  // log the reason. Only runs after the student has generated a first schedule.
  const busyRef = useRef(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    if (tasksLoading || scheduleLoading || !schedule || !settings.autoAdjust || busyRef.current || adjustError) return;

    const nowMs = now.getTime();
    const marked = markPastSessions(schedule.sessions, nowMs);
    const inputs = snapshotInputs(tasks, settings, marked.sessions, nowMs);
    const reasons = describeChanges(schedule.inputs, inputs);
    if (reasons.length === 0 && marked.newlyMissed === 0) return;

    busyRef.current = true;
    (async () => {
      try {
        const nextBehavior = computeBehavior(tasks, marked.sessions);
        const gen = generateSchedule({
          tasks,
          settings,
          behavior: nextBehavior,
          now: new Date(),
          mode: schedule.mode || "normal",
          extraMinutes: schedule.extraMinutes || 0,
          existingSessions: marked.sessions,
          hints: schedule.ai?.hints,
        });
        const allReasons = reasons.length ? reasons : [`You missed ${marked.newlyMissed} study session${marked.newlyMissed === 1 ? "" : "s"}.`];
        await saveSchedule(
          user.uid,
          buildScheduleDoc({
            tasks,
            settings,
            schedule,
            gen,
            mode: schedule.mode || "normal",
            extraMinutes: schedule.extraMinutes || 0,
            reasons: allReasons,
            ai: schedule.ai || null,
            now: new Date(),
          })
        );
      } catch (err) {
        console.error("Auto-adjust failed:", err);
        setAdjustError(friendlyError(err));
      } finally {
        busyRef.current = false;
      }
    })();
  }, [tasks, tasksLoading, schedule, scheduleLoading, settings, now, user.uid, adjustError]);

  // ---- SMART REMINDERS (Feature 9) ----
  // Creates notifications that should exist now but do not yet (deadlines, overdue tasks,
  // upcoming/missed sessions, high-risk tasks, Rescue Mode). Existing keys are skipped.
  const notifyBusy = useRef(false);
  const [notifyFailed, setNotifyFailed] = useState(false);
  useEffect(() => {
    if (tasksLoading || scheduleLoading || notificationsLoading || notificationsError || notifyFailed || notifyBusy.current) return;
    const existing = new Set(notifications.map((n) => n.key));
    const missing = buildNotifications({ tasks, sessions, riskById, rescue, now }).filter((n) => !existing.has(n.key));
    if (missing.length === 0) return;

    notifyBusy.current = true;
    createNotifications(user.uid, missing.slice(0, 20))
      .catch((err) => {
        console.error("Could not create notifications:", err);
        setNotifyFailed(true);
      })
      .finally(() => {
        notifyBusy.current = false;
      });
  }, [tasks, tasksLoading, sessions, scheduleLoading, riskById, rescue, now, notifications, notificationsLoading, notificationsError, notifyFailed, user.uid]);

  const value = {
    focusSessions,
    habits,
    habitLogs,
    goals,
    notifications,
    notificationsLoading,
    unreadCount: notifications.filter((n) => !n.read).length,
    tasks,
    loading: tasksLoading,
    error,
    settings,
    usingDefaultSettings,
    schedule,
    scheduleLoading,
    scheduleError: scheduleError || adjustError,
    sessions,
    behavior,
    ranking,
    priorityById,
    riskById,
    rescue,
    now,
    mode,
    extraMinutes,
    regenerate,
    regenerateWithAI,
    aiInfo,
    endRescue,
    applyGenerated,
    missedCount: countMissed(sessions),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside <PlanProvider>.");
  return ctx;
}
