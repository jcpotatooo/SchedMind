import { differenceInCalendarDays, format, isSameDay, startOfDay, subDays } from "date-fns";
import { isOverdue } from "./taskConstants.js";

// Turns the raw task list into the numbers the dashboard shows.
// Everything is calculated from the student's real tasks. Nothing is hardcoded.
export function computeDashboardStats(tasks, now = new Date()) {
  const done = tasks.filter((t) => t.status === "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const todo = tasks.filter((t) => t.status === "todo");
  const unfinished = tasks.filter((t) => t.status !== "done");

  // Last 7 days (oldest first) with how many tasks were completed each day.
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const day = subDays(startOfDay(now), i);
    week.push({
      label: format(day, "EEE"),
      tasksDone: done.filter((t) => t.completedAt && isSameDay(t.completedAt, day)).length,
    });
  }

  return {
    total: tasks.length,
    doneCount: done.length,
    inProgressCount: inProgress.length,
    todoCount: todo.length,
    overdueCount: tasks.filter((t) => isOverdue(t, now)).length,
    completionPercent: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    // Total of the time estimates for everything not finished yet.
    remainingMinutes: unfinished.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0),
    bestStreak: longestCompletionStreak(done),
    week,
    weekTotal: week.reduce((sum, d) => sum + d.tasksDone, 0),
    // INTERIM ordering (nearest deadline first). Phase 3 replaces this with the
    // real priority score (urgency + importance + difficulty + workload).
    upcoming: [...unfinished].sort((a, b) => a.deadline - b.deadline).slice(0, 5),
  };
}

// Longest run of consecutive days with at least one completed task.
// (Phase 4 will switch this to study sessions / habits.)
function longestCompletionStreak(doneTasks) {
  const days = [...new Set(doneTasks.filter((t) => t.completedAt).map((t) => startOfDay(t.completedAt).getTime()))]
    .sort((a, b) => a - b)
    .map((ms) => new Date(ms));

  let best = 0;
  let current = 0;
  days.forEach((day, i) => {
    current = i > 0 && differenceInCalendarDays(day, days[i - 1]) === 1 ? current + 1 : 1;
    best = Math.max(best, current);
  });
  return best;
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
