// Small text helpers used by the planning engine (no libraries needed).

// 150 -> "2 h 30 min"
export function fmtMin(minutes) {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

// A length of time in milliseconds -> "3 hours" / "2 days" (always positive).
export function timeText(ms) {
  const minutes = Math.abs(ms) / 60000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = minutes / 60;
  if (hours < 48) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${Math.round(hours / 24)} days`;
}

// A moment in time -> "Tue, Nov 24, 7:00 PM"
export function fmtWhen(ms) {
  return new Date(ms).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// 19 -> "7 PM"
export function fmtHour(hour) {
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
}

export const isTaskOverdue = (task, nowMs) =>
  task.status !== "done" && !!task.deadline && task.deadline.getTime() <= nowMs;
