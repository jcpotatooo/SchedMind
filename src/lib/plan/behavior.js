import { fmtHour } from "./format.js";

// BEHAVIOR LEARNING (rule-based, NOT machine learning).
// It looks at what the student really did and nudges future plans:
//  1. estimationFactor : average (actual time / estimated time) of finished tasks.
//  2. missedRate       : share of study sessions that were missed.
//  3. peakHours        : hours of the day when the student most often finishes sessions.
// Each rule only switches on once there is enough data, and says so.
const MIN_TASK_SAMPLES = 3;
const MIN_SESSIONS = 5;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function computeBehavior(tasks, sessions) {
  // 1. Estimated vs actual time
  const samples = tasks.filter((t) => t.status === "done" && t.actualMinutes > 0 && t.estimatedMinutes > 0);
  const ratios = samples.map((t) => t.actualMinutes / t.estimatedMinutes);
  const enoughTasks = samples.length >= MIN_TASK_SAMPLES;
  const average = ratios.reduce((a, b) => a + b, 0) / (ratios.length || 1);
  const estimationFactor = enoughTasks ? clamp(Math.round(average * 100) / 100, 0.6, 2) : 1;

  // 2. Missed sessions
  const done = sessions.filter((s) => s.status === "done");
  const missed = sessions.filter((s) => s.status === "missed");
  const resolved = done.length + missed.length;
  const enoughSessions = resolved >= MIN_SESSIONS;
  const missedRate = enoughSessions ? missed.length / resolved : 0;
  // Reliability shrinks the study time we count on (all missed -> only 50% trusted).
  const reliability = 1 - 0.5 * missedRate;

  // 3. Productive hours (only hours with 2+ completed sessions count)
  const hourCounts = {};
  done.forEach((s) => {
    const hour = new Date(s.start).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHours =
    done.length >= MIN_SESSIONS
      ? Object.entries(hourCounts)
          .filter(([, count]) => count >= 2)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([hour]) => Number(hour))
      : [];

  return {
    estimationFactor,
    taskSamples: samples.length,
    enoughTasks,
    missedCount: missed.length,
    doneSessions: done.length,
    resolvedSessions: resolved,
    enoughSessions,
    missedRate,
    reliability,
    peakHours,
    peakLabels: peakHours.map(fmtHour),
  };
}
