import { isTaskOverdue } from "./format.js";

const DAY_MS = 86400000;

// DEADLINE RESCUE MODE: when is the student "falling behind"?
// Any one of these turns it on:
//  - at least one unfinished task is overdue
//  - at least one task is High risk (not enough time left)
//  - 2 or more study sessions were missed in the last 3 days
export function getRescueStatus({ tasks, riskById, sessions, now }) {
  const nowMs = now.getTime();
  const open = tasks.filter((t) => t.status !== "done");

  const overdue = open.filter((t) => isTaskOverdue(t, nowMs));
  const overdueIds = new Set(overdue.map((t) => t.id));
  const highRisk = open.filter((t) => !overdueIds.has(t.id) && riskById[t.id]?.level === "High");
  const dueSoon = open.filter((t) => !overdueIds.has(t.id) && t.deadline.getTime() - nowMs <= 3 * DAY_MS);
  const recentMissed = sessions.filter((s) => s.status === "missed" && s.end > nowMs - 3 * DAY_MS).length;

  return {
    needed: overdue.length > 0 || highRisk.length > 0 || recentMissed >= 2,
    overdue,
    highRisk,
    dueSoon,
    recentMissed,
  };
}
