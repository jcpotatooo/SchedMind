// How much work is LEFT on a task? One place, used by priority, risk and scheduler,
// so all three always agree.

// Harder tasks get a small safety buffer on top of the student's estimate.
const DIFFICULTY_BUFFER = { 1: 1.0, 2: 1.1, 3: 1.2 };

export function effectiveMinutes(task, behavior) {
  // behavior.estimationFactor comes from Behavior Learning (1 = no data yet).
  const factor = behavior?.estimationFactor || 1;
  return Math.round(task.estimatedMinutes * factor * (DIFFICULTY_BUFFER[task.difficulty] || 1));
}

export function remainingWork(task, behavior) {
  const effective = effectiveMinutes(task, behavior);
  const studied = task.studiedMinutes || 0; // minutes from sessions marked Done
  let remaining = effective - studied;
  let overrun = false;

  // Studied more than planned but the task is not finished: it is taking longer
  // than expected. Reserve ONE extra block (25% of the estimate, min 15 min).
  // The reserve is used up as the student studies, so it does not renew forever.
  if (remaining <= 0) {
    overrun = true;
    const reserve = Math.max(15, Math.round(task.estimatedMinutes * 0.25));
    remaining = Math.max(0, effective + reserve - studied);
  }
  return { effective, studied, remaining: Math.ceil(remaining / 5) * 5, overrun };
}
