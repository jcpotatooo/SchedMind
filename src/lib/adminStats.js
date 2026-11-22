import { addDaysMs, startOfWeekMs } from "./activity.js";

// ADMIN STATISTICS (Feature 14). Pure function: takes the raw records the admin is
// allowed to read and returns counts only. Task titles and notes are never shown
// to admins, only totals per student.
const DAY = 86400000;

export function computeAdminStats({ users, tasks, focusSessions, now }) {
  const nowMs = now.getTime();
  const weekAgo = nowMs - 7 * DAY;

  const perUser = new Map();
  const slot = (uid) => {
    if (!perUser.has(uid)) perUser.set(uid, { tasks: 0, done: 0, overdue: 0, focusMinutes: 0, lastActive: 0 });
    return perUser.get(uid);
  };
  const touch = (s, ms) => {
    if (ms && ms > s.lastActive) s.lastActive = ms;
  };

  tasks.forEach((t) => {
    const s = slot(t.userId);
    s.tasks += 1;
    if (t.status === "done") s.done += 1;
    else if (t.deadline && t.deadline.getTime() <= nowMs) s.overdue += 1;
    touch(s, (t.completedAt || t.updatedAt || t.createdAt)?.getTime?.());
  });
  focusSessions.forEach((f) => {
    const s = slot(f.userId);
    s.focusMinutes += f.minutes || 0;
    touch(s, f.startedAt?.getTime?.());
  });

  const rows = users
    .map((u) => {
      const s = slot(u.uid || u.id);
      return {
        uid: u.uid || u.id,
        name: u.name || "(no name)",
        email: u.email || "",
        role: u.role || "student",
        createdAt: u.createdAt?.getTime?.() || 0,
        ...s,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  // New sign-ups in each of the last 8 weeks (Monday to Sunday), oldest first.
  const thisWeek = startOfWeekMs(now);
  const signups = [];
  for (let w = 7; w >= 0; w--) {
    const start = addDaysMs(thisWeek, -7 * w);
    const end = addDaysMs(start, 7);
    signups.push({
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: rows.filter((r) => r.createdAt >= start && r.createdAt < end).length,
    });
  }

  const students = rows.filter((r) => r.role !== "admin");
  const done = tasks.filter((t) => t.status === "done").length;
  return {
    studentCount: students.length,
    adminCount: rows.length - students.length,
    activeThisWeek: students.filter((r) => r.lastActive >= weekAgo).length,
    totals: {
      tasks: tasks.length,
      done,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      todo: tasks.filter((t) => t.status === "todo").length,
      overdue: rows.reduce((n, r) => n + r.overdue, 0),
      focusMinutes: focusSessions.reduce((n, f) => n + (f.minutes || 0), 0),
      completionPercent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    },
    signups,
    rows,
  };
}
