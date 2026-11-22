import { dayKey } from "./activity.js";
import { fmtWhen, isTaskOverdue, timeText } from "./plan/format.js";

// SMART REMINDERS (Feature 9). Works out which notifications SHOULD exist right now.
// Every notification has a unique "key" (for example "overdue:<taskId>:<deadline>").
// The app only saves keys that do not exist yet, so nothing is repeated, and a
// notification you marked as read never comes back.
const HOUR = 3600000;

export function buildNotifications({ tasks, sessions, riskById, rescue, now }) {
  const nowMs = now.getTime();
  const out = [];
  const add = (key, type, title, message, link) => out.push({ key, type, title, message, link });

  tasks
    .filter((t) => t.status !== "done" && t.deadline)
    .forEach((t) => {
      const due = t.deadline.getTime();
      const stamp = `${t.id}:${due}`; // a new deadline = a new reminder
      if (isTaskOverdue(t, nowMs)) {
        add(`overdue:${stamp}`, "overdue", "Task overdue", `“${t.title}” was due ${fmtWhen(due)} and is not finished.`, "/tasks");
        return;
      }
      if (due - nowMs <= 24 * HOUR) {
        add(`due24:${stamp}`, "deadline", "Deadline within 24 hours", `“${t.title}” is due in ${timeText(due - nowMs)} (${fmtWhen(due)}).`, "/tasks");
      } else if (due - nowMs <= 72 * HOUR) {
        add(`due72:${stamp}`, "deadline", "Deadline coming up", `“${t.title}” is due in ${timeText(due - nowMs)}.`, "/tasks");
      }
      const risk = riskById[t.id];
      if (risk && risk.level === "High") {
        add(`risk:${stamp}`, "recommendation", "A task is at risk", `“${t.title}” may not be finished in time. ${risk.action}`, "/schedule");
      }
    });

  sessions.forEach((s) => {
    if (s.status === "planned" && s.start > nowMs && s.start - nowMs <= HOUR) {
      add(`session:${s.id}`, "session", "Study session starting soon",
        `“${s.taskTitle}” starts at ${new Date(s.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`, "/schedule");
    }
    if (s.status === "missed" && s.end > nowMs - 48 * HOUR) {
      add(`missed:${s.id}`, "missed", "Missed study session",
        `You missed “${s.taskTitle}” (${fmtWhen(s.start)}). Your schedule was adjusted.`, "/schedule");
    }
  });

  // Evening nudge: planned sessions today that are still ahead.
  if (now.getHours() >= 18) {
    const today = dayKey(now);
    const left = sessions.filter((s) => s.status === "planned" && s.end > nowMs && dayKey(s.start) === today).length;
    if (left > 0) {
      add(`unfinished:${today}`, "session", "Unfinished study plan",
        `You still have ${left} study session${left === 1 ? "" : "s"} planned for tonight.`, "/schedule");
    }
  }

  if (rescue.needed) {
    add(`rescue:${dayKey(now)}`, "recommendation", "Rescue Mode recommended",
      "You may be falling behind. Review a recovery plan before more deadlines slip.", "/rescue");
  }
  return out;
}
