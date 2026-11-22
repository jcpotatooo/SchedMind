// AI-ASSISTED SCHEDULING (hybrid design: the AI DECIDES, the engine VERIFIES).
//
// What the AI (Google Gemini, called through our server) is allowed to do, per task:
//   - give a priority score 0-100,
//   - say how many minutes of work are really left,
//   - write a short reason.
// What the AI is NOT allowed to do: choose times. The planner (scheduler.js) still places
// every session itself, so sessions can never overlap, never leave the student's study
// hours and never pass a deadline, whatever the AI says. Every AI number is also
// clamped here before it is used. If the AI fails, the rule-based scheduler runs alone.

const MAX_TASKS = 25;
const iso = (ms) => new Date(ms).toISOString().slice(0, 16);

// A "fingerprint" of the fields the AI looked at. If the student edits the task
// (deadline, estimate, difficulty, importance), the old AI advice is ignored.
export function taskSig(task) {
  return `${task.deadline.getTime()}:${task.estimatedMinutes}:${task.difficulty}:${task.importance}`;
}

// The AI advice for a task, only if it is still valid for the task as it is now.
export function usableHint(hints, task) {
  const h = hints?.[task.id];
  return h && h.sig === taskSig(task) ? h : null;
}

// Minutes still needed according to the AI, reduced by what the student studied since.
export function hintRemaining(hint, task) {
  const since = Math.max(0, (task.studiedMinutes || 0) - (hint.s || 0));
  return Math.max(0, Math.ceil((hint.m - since) / 5) * 5);
}

const roundTo5 = (n) => Math.round(n / 5) * 5;

// Builds the request: a SMALL summary of the student's data (no name, email or user id).
export function buildAIRequest({ ranking, settings, behavior, now }) {
  const nowMs = now.getTime();
  const picked = ranking.slice(0, MAX_TASKS);

  const sent = picked.map((item) => ({
    id: item.task.id,
    sig: taskSig(item.task),
    remaining: item.work.remaining,
    studied: item.task.studiedMinutes || 0,
  }));

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const context = {
    now: iso(nowMs),
    studyWindows: Object.entries(settings.availability || {})
      .filter(([, w]) => w.enabled)
      .map(([d, w]) => `${days[d]} ${w.start}-${w.end}`),
    maxSessionMinutes: settings.maxSessionMinutes,
    habits: {
      estimateFactor: behavior.enoughTasks ? behavior.estimationFactor : null,
      missedSessionRatePercent: behavior.enoughSessions ? Math.round(behavior.missedRate * 100) : null,
      bestStudyHours: behavior.peakLabels,
    },
    tasks: picked.map((item) => ({
      id: item.task.id,
      title: item.task.title.slice(0, 80),
      category: item.task.category,
      deadline: iso(item.task.deadline.getTime()),
      hoursLeft: Math.round((item.task.deadline.getTime() - nowMs) / 360000) / 10,
      estimatedMinutes: item.task.estimatedMinutes,
      remainingMinutes: item.work.remaining,
      studiedMinutes: item.task.studiedMinutes || 0,
      difficulty: item.task.difficulty,
      importance: item.task.importance,
      ruleBasedPriority: item.score,
      overdue: item.overdue,
    })),
  };
  return { context, sent };
}

// Checks and limits everything the AI returned. Anything odd is dropped.
export function cleanHints(rawHints, sent) {
  const byId = new Map(sent.map((s) => [s.id, s]));
  const out = {};
  (Array.isArray(rawHints) ? rawHints : []).forEach((h) => {
    const base = byId.get(h?.id);
    if (!base) return; // the AI invented a task id
    const p = Number(h.priority);
    const m = Number(h.minutes);
    if (!Number.isFinite(p) || !Number.isFinite(m)) return;
    const low = Math.max(15, roundTo5(base.remaining * 0.5));
    const high = Math.max(low, roundTo5(base.remaining * 2));
    out[base.id] = {
      p: Math.min(100, Math.max(0, Math.round(p))),
      m: Math.min(high, Math.max(low, roundTo5(m))),
      r: String(h.reason || "").replace(/\s+/g, " ").trim().slice(0, 160),
      s: base.studied,
      sig: base.sig,
    };
  });
  return out;
}
