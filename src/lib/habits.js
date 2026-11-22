import { addDaysMs, dayKey, startOfDayMs, streaks } from "./activity.js";

// Habit statistics. A habit is checked once per day; one log per habit per day
// (habitLogs document id = habitId_yyyy-MM-dd, so a day can never be counted twice).
export function habitStats(habits, logs, now) {
  const today = dayKey(now);
  const byHabit = new Map();
  logs.forEach((log) => {
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Set());
    byHabit.get(log.habitId).add(log.date);
  });

  const todayMs = startOfDayMs(now);
  const items = habits.map((habit) => {
    const set = byHabit.get(habit.id) || new Set();
    const { current, best } = streaks(set, now);
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const ms = addDaysMs(todayMs, -i);
      week.push({
        key: dayKey(ms),
        label: new Date(ms).toLocaleDateString("en-US", { weekday: "narrow" }),
        done: set.has(dayKey(ms)),
      });
    }
    return { habit, doneToday: set.has(today), streak: current, best, week };
  });

  return {
    items,
    total: items.length,
    doneToday: items.filter((i) => i.doneToday).length,
    bestStreak: items.reduce((max, i) => Math.max(max, i.best), 0),
  };
}
