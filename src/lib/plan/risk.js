import { capacityMinutes } from "./time.js";
import { remainingWork } from "./workload.js";
import { fmtMin, timeText, isTaskOverdue } from "./format.js";

// DEADLINE RISK PREDICTION (rule-based).
// Tasks are checked in deadline order. For each one we compare
//   demand   = work still needed for THIS task + every task due before it
//   capacity = study time available before THIS deadline (reduced if the
//              student often misses sessions)
// ratio = demand / capacity
//   ratio > 1.00  -> High risk   (not enough time, even if everything goes to plan)
//   ratio > 0.75  -> Medium risk (very tight)
//   otherwise     -> Low risk
// Overdue tasks are always High risk. Difficulty and past behavior are already
// inside "demand" (see workload.js).
export function assessRisks({ tasks, slots, behavior, now }) {
  const nowMs = now.getTime();
  const open = tasks.filter((t) => t.status !== "done").sort((a, b) => a.deadline - b.deadline);

  const byId = {};
  let demand = 0;

  for (const task of open) {
    const work = remainingWork(task, behavior);
    const overdue = isTaskOverdue(task, nowMs);
    const rawCapacity = capacityMinutes(slots, task.deadline.getTime());
    const capacity = rawCapacity * behavior.reliability;

    // "Hopeless" = this task alone needs more than ALL the time before its deadline.
    // The scheduler gives such a task only leftover time, so its work is NOT counted
    // against the tasks due after it (otherwise one impossible task would make
    // every later task look doomed).
    const hopeless = !overdue && work.remaining > rawCapacity;
    let demandHere;
    if (hopeless) {
      demandHere = demand + work.remaining;
    } else {
      demand += work.remaining;
      demandHere = demand;
    }

    const ratio = capacity > 0 ? demandHere / capacity : Infinity;
    const hoursLeft = (task.deadline.getTime() - nowMs) / 3600000;

    let level = "Low";
    if (overdue || ratio > 1) level = "High";
    else if (ratio > 0.75 || (hoursLeft < 24 && ratio > 0.5)) level = "Medium";

    let explanation;
    let action;
    if (overdue) {
      explanation = `The deadline passed ${timeText(task.deadline.getTime() - nowMs)} ago and about ${fmtMin(work.remaining)} of work is left.`;
      action = "Finish it first, or ask your instructor about a late submission. Open Rescue Mode to re-plan.";
    } else if (hopeless) {
      explanation = `This task alone needs about ${fmtMin(work.remaining)} but only about ${fmtMin(rawCapacity)} of study time is available before the deadline, so it probably cannot be finished in time. Your other tasks are planned without it.`;
      action = "Ask for an extension, cut the scope, or add study hours in Settings (Rescue Mode can add extra hours).";
    } else if (level === "High") {
      explanation = `You need about ${fmtMin(demandHere)} of study time (including tasks due before this one) but only about ${fmtMin(capacity)} is available before the deadline.`;
      action = "Add study hours in Settings, use Rescue Mode extra hours, reduce the scope, or ask for an extension.";
    } else if (level === "Medium") {
      explanation = `It is tight: you need about ${fmtMin(demandHere)} out of about ${fmtMin(capacity)} available (${Math.round(ratio * 100)}% of your free time).`;
      action = "Start soon and try not to skip sessions.";
    } else {
      explanation = `Comfortable: you need about ${fmtMin(demandHere)} and have about ${fmtMin(capacity)} available.`;
      action = "Keep following your schedule.";
    }

    byId[task.id] = { level, ratio, demand: demandHere, capacity, explanation, action, overdue, hopeless };
  }
  return byId;
}
