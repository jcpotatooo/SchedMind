import { capacityMinutes } from "./time.js";
import { remainingWork } from "./workload.js";
import { fmtMin, timeText, isTaskOverdue } from "./format.js";
import { hintRemaining, usableHint } from "./aiHints.js";

// INTELLIGENT TASK PRIORITIZATION (rule-based, explainable).
// Each task gets four scores from 0 to 100, then a weighted total:
//   priority = 40% urgency + 25% importance + 15% difficulty + 20% workload pressure
// Level: High (65+ or overdue), Medium (40-64), Low (below 40).
export const WEIGHTS = { urgency: 0.4, importance: 0.25, difficulty: 0.15, workload: 0.2 };

// Urgency from hours left until the deadline (step table, easy to explain).
export function urgencyScore(hoursLeft) {
  if (hoursLeft <= 0) return 100; // overdue
  if (hoursLeft < 24) return 95;
  if (hoursLeft < 48) return 85;
  if (hoursLeft < 72) return 70;
  if (hoursLeft < 168) return 50; // within a week
  if (hoursLeft < 336) return 30; // within two weeks
  return 15;
}

const LEVEL_SCORE = { 1: 33, 2: 67, 3: 100 };
const LEVEL_NAME = { 1: "Low", 2: "Medium", 3: "High" };

const FACTOR_TEXT = {
  urgency: "its deadline is closer",
  importance: "it is more important",
  difficulty: "it is harder and needs more focus time",
  workload: "it needs more work compared with the time available",
};

// hints (optional) = advice from the AI scheduler, already checked by cleanHints().
// The final score is 50% rule-based + 50% AI priority, and the AI's estimate of the
// time still needed replaces the rule-based estimate (limited to 50%-200% of it).
export function rankTasks({ tasks, slots, behavior, now, hints = null }) {
  const nowMs = now.getTime();

  const items = tasks
    .filter((t) => t.status !== "done")
    .map((task) => {
      const msLeft = task.deadline.getTime() - nowMs;
      const overdue = isTaskOverdue(task, nowMs);
      let work = remainingWork(task, behavior);
      const hint = usableHint(hints, task);
      if (hint) work = { ...work, remaining: hintRemaining(hint, task) };

      // Study time before the deadline that we can realistically count on.
      const capacity = overdue ? 0 : capacityMinutes(slots, task.deadline.getTime()) * behavior.reliability;
      const workloadPressure = capacity <= 0 ? 100 : Math.min(100, (work.remaining / capacity) * 100);

      const comps = {
        urgency: urgencyScore(msLeft / 3600000),
        importance: LEVEL_SCORE[task.importance] ?? 67,
        difficulty: LEVEL_SCORE[task.difficulty] ?? 67,
        workload: Math.round(workloadPressure),
      };
      const ruleScore = Math.round(
        WEIGHTS.urgency * comps.urgency +
          WEIGHTS.importance * comps.importance +
          WEIGHTS.difficulty * comps.difficulty +
          WEIGHTS.workload * comps.workload
      );
      const score = hint ? Math.round(0.5 * ruleScore + 0.5 * hint.p) : ruleScore;
      const level = overdue || score >= 65 ? "High" : score >= 40 ? "Medium" : "Low";

      // Plain-language reasons (Feature 7: explainable recommendations).
      const reasons = [];
      reasons.push(overdue ? `Deadline passed ${timeText(msLeft)} ago.` : `Due in ${timeText(msLeft)}.`);
      reasons.push(`${LEVEL_NAME[task.importance] || "Medium"} importance.`);
      if (task.difficulty === 3) reasons.push("Hard task, so it needs extra focus time.");
      if (capacity <= 0) reasons.push("No study time is available before the deadline.");
      else
        reasons.push(
          `Needs about ${fmtMin(work.remaining)} and you have about ${fmtMin(capacity)} of study time before the deadline.`
        );
      if (Math.abs(behavior.estimationFactor - 1) >= 0.1)
        reasons.push(`Your past tasks took ${behavior.estimationFactor}× your estimates, so extra time is included.`);
      if (work.overrun) reasons.push("You already studied longer than estimated, so extra time is reserved.");

      if (hint && hint.r) reasons.unshift(`AI: ${hint.r}`);

      return { task, score, level, overdue, comps, reasons, work, capacity, rank: 0, rankNote: null, ai: hint ? { priority: hint.p, ruleScore } : null };
    });

  items.sort((a, b) => b.score - a.score || a.task.deadline - b.task.deadline);

  // Explain the order: why is #1 above #2, and so on.
  items.forEach((item, i) => {
    item.rank = i + 1;
    const next = items[i + 1];
    if (!next) return;
    let best = null;
    let bestDiff = 0;
    for (const key of Object.keys(WEIGHTS)) {
      const diff = WEIGHTS[key] * (item.comps[key] - next.comps[key]);
      if (diff > bestDiff) {
        bestDiff = diff;
        best = key;
      }
    }
    item.rankNote = best
      ? `Do this before “${next.task.title}” because ${FACTOR_TEXT[best]}.`
      : `Similar priority to “${next.task.title}”, so the earlier deadline goes first.`;
  });

  const byId = {};
  items.forEach((item) => (byId[item.task.id] = item));
  return { list: items, byId };
}
