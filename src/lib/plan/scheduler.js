import { SLOT_MINUTES, buildSlots, removeBlocked } from "./time.js";
import { rankTasks } from "./priority.js";

// SMART SCHEDULING (rule-based greedy algorithm, NOT machine learning).
//
// 1. Cut the student's weekly study hours into 30-minute slots, starting now.
// 2. Rank all unfinished tasks (priority.js).
// 3. Walk through the slots in time order and give each slot to ONE task.
//    -> Every slot has exactly one owner, so sessions can never overlap.
// 4. Who gets a slot? The highest-ranked task that still needs work and whose
//    deadline is after the slot, with two safety rules:
//    a) "Zero slack" rule: if the tasks due by some deadline need ALL the time that
//       is left before it, only those tasks may use this slot (protects tight deadlines).
//    b) "Hopeless" rule: a task that cannot be finished in the time before its own
//       deadline only gets slots nobody else needs (it must not steal time from
//       tasks that can still be saved).
// 5. Behavior learning: in the student's most productive hours, hard tasks get the slot first.
// 6. Touching slots of the same task are merged into sessions (max length from Settings).
//    Take a short break between sessions; breaks are not scheduled, so no study time is wasted.
// 7. Anything that does not fit is reported as "unscheduled" (with the missing minutes).
//
// AI HINTS (optional): when `hints` is given, the AI's priority and time estimates are blended
// into step 2 (see aiHints.js). The AI never picks times, so steps 3-7 stay the same.
//
// mode "rescue": ordering becomes overdue first, then nearest deadline first (EDF),
// the safest way to save as many deadlines as possible.
export function generateSchedule({ tasks, settings, behavior, now = new Date(), mode = "normal", extraMinutes = 0, existingSessions = [], hints = null }) {
  // Slots already used by Done/Missed sessions are not offered again.
  const slots = removeBlocked(buildSlots(settings, now, extraMinutes), existingSessions, now.getTime());
  const { list, byId } = rankTasks({ tasks, slots, behavior, now, hints });

  // Number of slots that end on or before each task's deadline (a slot index limit).
  const slotLimit = new Map();
  for (const item of list) {
    const deadline = item.task.deadline.getTime();
    let count = 0;
    while (count < slots.length && slots[count].end <= deadline) count++;
    slotLimit.set(item.task.id, count);
  }

  const order = [...list];
  if (mode === "rescue") {
    order.sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) || a.task.deadline - b.task.deadline || b.score - a.score
    );
  }

  const remaining = new Map(list.map((item) => [item.task.id, item.work.remaining]));

  // Hopeless: needs more minutes than ALL slots before its own deadline (overdue tasks are never hopeless).
  const hopeless = new Set(
    list
      .filter((item) => !item.overdue && item.work.remaining > slotLimit.get(item.task.id) * SLOT_MINUTES)
      .map((item) => item.task.id)
  );

  const assignments = [];

  slots.forEach((slot, index) => {
    const open = order.filter(
      (item) => remaining.get(item.task.id) > 0 && (item.overdue || slot.end <= item.task.deadline.getTime())
    );
    if (open.length === 0) return;

    // Tasks that can still be saved come before hopeless ones.
    const savable = open.filter((item) => !hopeless.has(item.task.id));
    let pool = savable.length ? savable : open;

    // Zero-slack rule: find the earliest deadline whose tasks need all remaining time.
    if (savable.length) {
      const dueDates = [...new Set(savable.filter((i) => !i.overdue).map((i) => i.task.deadline.getTime()))].sort((a, b) => a - b);
      for (const due of dueDates) {
        const group = savable.filter((i) => i.overdue || i.task.deadline.getTime() <= due);
        const demand = group.reduce((sum, i) => sum + remaining.get(i.task.id), 0);
        const dueIndex = Math.max(...group.filter((i) => !i.overdue).map((i) => slotLimit.get(i.task.id)));
        const capacity = (dueIndex - index) * SLOT_MINUTES;
        if (demand >= capacity) {
          pool = group;
          break;
        }
      }
    }

    let chosen = pool[0];
    let peak = false;
    if (behavior.peakHours.includes(new Date(slot.start).getHours())) {
      const hard = pool.slice(0, 3).find((item) => item.task.difficulty === 3);
      if (hard && hard !== chosen) {
        chosen = hard;
        peak = true;
      }
    }

    const id = chosen.task.id;
    const minutes = Math.min(SLOT_MINUTES, remaining.get(id));
    remaining.set(id, remaining.get(id) - minutes);
    assignments.push({ taskId: id, start: slot.start, minutes, peak });
  });

  // Merge touching slots of the same task into sessions (up to the max session length).
  const sessions = [];
  for (const a of assignments) {
    const last = sessions[sessions.length - 1];
    if (
      last &&
      last.taskId === a.taskId &&
      last.end === a.start &&
      last.minutes + a.minutes <= settings.maxSessionMinutes
    ) {
      last.minutes += a.minutes;
      last.end = a.start + a.minutes * 60000;
      last.peak = last.peak || a.peak;
      continue;
    }
    const item = byId[a.taskId];
    sessions.push({
      id: `${a.taskId}-${a.start}`,
      taskId: a.taskId,
      taskTitle: item.task.title,
      category: item.task.category,
      start: a.start,
      end: a.start + a.minutes * 60000,
      minutes: a.minutes,
      status: "planned",
      autoMissed: false,
      peak: a.peak,
      ai: !!item.ai,
      reason: "",
    });
  }

  // Explanation for every session (Feature 7).
  sessions.forEach((s) => {
    const item = byId[s.taskId];
    const parts = [`${item.level} priority (score ${item.score}/100): ${item.reasons.slice(0, 3).join(" ")}`];
    if (item.overdue) parts.push("It is already overdue, so it gets the first free time.");
    if (hopeless.has(s.taskId))
      parts.push("It cannot be fully finished before its deadline, so it only uses time that other tasks do not need.");
    if (s.peak) parts.push("Placed in one of your most productive hours.");
    if (mode === "rescue") parts.push("Rescue Mode: tasks are ordered by nearest deadline first.");
    s.reason = parts.join(" ");
  });

  const unscheduled = [];
  for (const item of list) {
    const left = remaining.get(item.task.id);
    if (left > 0) unscheduled.push({ taskId: item.task.id, title: item.task.title, shortfall: left });
  }

  return { sessions, unscheduled, ranking: list };
}
