import { CATEGORIES } from "./taskConstants.js";

// Date + activity helpers for Progress, Dashboard, Habits and Goals.
// "Study activity" = a finished focus session, a study session marked Done, or a completed task.

const pad = (n) => String(n).padStart(2, "0");

// "2026-11-21" in the student's local time zone.
export const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const startOfDayMs = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const addDaysMs = (ms, n) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
};
// Weeks start on Monday.
export function startOfWeekMs(value) {
  const d = new Date(startOfDayMs(value));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
const shortDay = (ms) => new Date(ms).toLocaleDateString("en-US", { weekday: "short" });
const shortDate = (ms) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Streaks from a Set of "yyyy-MM-dd" keys.
//  current = days in a row ending today (or yesterday, if today has no activity yet)
//  best    = longest run ever
export function streaks(daySet, now) {
  let cursor = startOfDayMs(now);
  if (!daySet.has(dayKey(cursor))) cursor = addDaysMs(cursor, -1);
  let current = 0;
  while (daySet.has(dayKey(cursor))) {
    current++;
    cursor = addDaysMs(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of [...daySet].sort()) {
    const [y, m, d] = key.split("-").map(Number);
    run = prev !== null && dayKey(addDaysMs(prev, 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = new Date(y, m - 1, d).getTime();
  }
  return { current, best };
}

// Study minutes (focus sessions + study sessions marked Done) from a given moment on.
export function studyMinutesSince(focusSessions, sessions, sinceMs) {
  let total = 0;
  focusSessions.forEach((f) => {
    if (new Date(f.startedAt).getTime() >= sinceMs) total += f.minutes || 0;
  });
  sessions.forEach((s) => {
    if (s.status === "done" && s.start >= sinceMs) total += s.minutes || 0;
  });
  return total;
}

// Everything the Progress page and Dashboard show, calculated from real records.
export function computeProgress({ tasks, focusSessions, sessions, now }) {
  const nowMs = now.getTime();
  const done = tasks.filter((t) => t.status === "done");

  const counts = {
    total: tasks.length,
    done: done.length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    todo: tasks.filter((t) => t.status === "todo").length,
    overdue: tasks.filter((t) => t.status !== "done" && t.deadline && t.deadline.getTime() <= nowMs).length,
  };

  const focusByDay = {};
  const studyByDay = {};
  const tasksByDay = {};
  const add = (map, key, n) => (map[key] = (map[key] || 0) + n);

  focusSessions.forEach((f) => {
    const key = dayKey(f.startedAt);
    add(focusByDay, key, f.minutes || 0);
    add(studyByDay, key, f.minutes || 0);
  });
  sessions.filter((s) => s.status === "done").forEach((s) => add(studyByDay, dayKey(s.start), s.minutes || 0));
  done.forEach((t) => t.completedAt && add(tasksByDay, dayKey(t.completedAt), 1));

  const activeDays = new Set([
    ...Object.keys(studyByDay).filter((k) => studyByDay[k] > 0),
    ...Object.keys(tasksByDay),
  ]);

  const today = startOfDayMs(now);
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const ms = addDaysMs(today, -i);
    const key = dayKey(ms);
    week.push({
      label: shortDay(ms),
      focusMinutes: focusByDay[key] || 0,
      studyMinutes: studyByDay[key] || 0,
      tasksDone: tasksByDay[key] || 0,
    });
  }

  // Last 8 weeks (Monday to Sunday), oldest first.
  const weeks = [];
  const thisWeek = startOfWeekMs(now);
  for (let w = 7; w >= 0; w--) {
    const start = addDaysMs(thisWeek, -7 * w);
    let study = 0;
    let tasksDone = 0;
    for (let d = 0; d < 7; d++) {
      const key = dayKey(addDaysMs(start, d));
      study += studyByDay[key] || 0;
      tasksDone += tasksByDay[key] || 0;
    }
    weeks.push({ label: shortDate(start), studyMinutes: study, tasksDone });
  }

  return {
    counts,
    completionPercent: counts.total ? Math.round((counts.done / counts.total) * 100) : 0,
    totalFocusMinutes: focusSessions.reduce((sum, f) => sum + (f.minutes || 0), 0),
    totalStudyMinutes: Object.values(studyByDay).reduce((a, b) => a + b, 0),
    week,
    weekFocusMinutes: week.reduce((s, d) => s + d.focusMinutes, 0),
    weekTasksDone: week.reduce((s, d) => s + d.tasksDone, 0),
    weeks,
    streak: streaks(activeDays, now),
    byCategory: CATEGORIES.map((category) => ({
      category,
      total: tasks.filter((t) => t.category === category).length,
      done: done.filter((t) => t.category === category).length,
    })),
    // Estimated vs actual time of finished tasks (feeds Behavior Learning).
    accuracy: done
      .filter((t) => t.actualMinutes > 0)
      .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 5)
      .map((t) => ({ id: t.id, title: t.title, estimated: t.estimatedMinutes, actual: t.actualMinutes })),
  };
}
