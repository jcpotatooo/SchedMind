import { fmtMin, fmtWhen, isTaskOverdue } from "./format.js";

// AUTOMATIC SCHEDULE ADJUSTMENT helpers.
// We save a small "snapshot" of everything the schedule depends on. When the
// snapshot changes (new task, new deadline, missed session, new study hours,
// task taking longer...) the app re-plans and records WHY in the change log.

const GRACE_MS = 30 * 60000; // a planned session counts as missed 30 min after it ended

// Planned sessions that ended long ago and were never marked Done become "missed".
export function markPastSessions(sessions, nowMs) {
  let newlyMissed = 0;
  const marked = sessions.map((s) => {
    if (s.status === "planned" && s.end + GRACE_MS < nowMs) {
      newlyMissed++;
      return { ...s, status: "missed", autoMissed: true };
    }
    return s;
  });
  return { sessions: marked, newlyMissed };
}

export const countMissed = (sessions) => sessions.filter((s) => s.status === "missed").length;

export function snapshotInputs(tasks, settings, sessions, nowMs) {
  const map = {};
  tasks.forEach((t) => {
    map[t.id] = {
      t: t.title,
      d: t.deadline ? t.deadline.getTime() : 0,
      e: t.estimatedMinutes,
      s: t.status,
      f: t.difficulty,
      i: t.importance,
      st: t.studiedMinutes || 0,
    };
  });
  return {
    tasks: map,
    settings: JSON.stringify(settings),
    missed: countMissed(sessions),
    overdue: tasks.filter((t) => isTaskOverdue(t, nowMs)).length,
  };
}

// Compares the saved snapshot with the current one and returns readable reasons.
export function describeChanges(prev, next) {
  if (!prev || !prev.tasks) return [];
  const reasons = [];

  for (const [id, n] of Object.entries(next.tasks)) {
    const p = prev.tasks[id];
    if (!p) {
      if (n.s !== "done") reasons.push(`New task “${n.t}” was added.`);
      continue;
    }
    if (n.d !== p.d) reasons.push(`The deadline of “${n.t}” changed to ${fmtWhen(n.d)}.`);
    if (n.e !== p.e) reasons.push(`The estimate for “${n.t}” changed from ${fmtMin(p.e)} to ${fmtMin(n.e)}.`);
    if (n.f !== p.f || n.i !== p.i) reasons.push(`The importance or difficulty of “${n.t}” changed.`);
    if (n.s !== p.s) {
      const msg =
        n.s === "done"
          ? `“${n.t}” was completed.`
          : n.s === "in_progress" && p.s === "todo"
          ? `“${n.t}” was started.`
          : `“${n.t}” status changed.`;
      reasons.push(msg);
    }
    if (n.st > p.st) reasons.push(`Study progress was logged on “${n.t}”.`);
    if (n.st < p.st) reasons.push(`A study session for “${n.t}” was unmarked.`);
    if (n.st > n.e && p.st <= p.e && n.s !== "done") {
      reasons.push(`“${n.t}” is taking longer than expected, so extra time was reserved.`);
    }
  }
  for (const [id, p] of Object.entries(prev.tasks)) {
    if (!next.tasks[id] && p.s !== "done") reasons.push(`Task “${p.t}” was deleted.`);
  }
  if (next.settings !== prev.settings) reasons.push("Your available study hours or preferences changed.");
  if (next.missed > prev.missed) {
    const n = next.missed - prev.missed;
    reasons.push(`You missed ${n} study session${n === 1 ? "" : "s"}.`);
  }
  if (next.overdue > prev.overdue) reasons.push("A task became overdue.");
  return reasons;
}

// Lists how the plan moved, e.g. "Essay now starts Mon, Nov 23, 7:00 PM (was Tue ...)".
export function summarizeMoves(oldPlanned, newPlanned) {
  const first = (list) => {
    const map = new Map();
    list.forEach((s) => {
      if (!map.has(s.taskId) || s.start < map.get(s.taskId).start) map.set(s.taskId, s);
    });
    return map;
  };
  const before = first(oldPlanned);
  const after = first(newPlanned);
  const lines = [];

  for (const [taskId, s] of after) {
    const old = before.get(taskId);
    if (!old) lines.push(`“${s.taskTitle}” was added to your schedule (starts ${fmtWhen(s.start)}).`);
    else if (old.start !== s.start)
      lines.push(`“${s.taskTitle}” now starts ${fmtWhen(s.start)} (was ${fmtWhen(old.start)}).`);
  }
  for (const [taskId, s] of before) {
    if (!after.has(taskId)) lines.push(`“${s.taskTitle}” has no planned sessions anymore.`);
  }
  return lines.slice(0, 6);
}

// Builds the full document saved to Firestore (schedules/{uid}).
// Old finished/missed sessions are kept as history (this is what Behavior Learning reads).
export function buildScheduleDoc({ tasks, settings, schedule, gen, mode, extraMinutes, reasons, now, ai = null }) {
  const nowMs = now.getTime();
  const { sessions: marked } = markPastSessions(schedule?.sessions || [], nowMs);
  const doneTaskIds = new Set((tasks || []).filter((t) => t.status === "done").map((t) => t.id));

  const seen = new Set();
  const history = marked
    .filter((s) => s.status !== "planned")
    .filter((s) => {
      // Completed tasks never carry future sessions forward into the schedule
      if (doneTaskIds.has(s.taskId) && s.start > nowMs) return false;
      return seen.has(s.id) ? false : seen.add(s.id);
    })
    .slice(-200);

  const oldPlanned = marked.filter((s) => s.status === "planned");
  const sessions = [...history, ...gen.sessions];

  const entry = { at: nowMs, reasons, moves: summarizeMoves(oldPlanned, gen.sessions) };
  return {
    sessions,
    mode,
    extraMinutes,
    unscheduled: gen.unscheduled,
    inputs: snapshotInputs(tasks, settings, sessions, nowMs),
    changeLog: [entry, ...(schedule?.changeLog || [])].slice(0, 20),
    generatedAt: nowMs,
    ai: ai || null, // AI advice used for this schedule (null = rule-based only)
  };
}
