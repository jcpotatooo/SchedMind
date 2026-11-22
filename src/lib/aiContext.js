// Builds a SMALL summary of the student's own data to send to the AI Coach.
// PRIVACY: no email, no name, no user id. Only task titles, deadlines, status,
// SchedMind's own priority/risk results and study-habit numbers are included.
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16) : null);

export function buildCoachContext({ tasks, ranking, riskById, settings, behavior, sessions, now, focusTaskId }) {
  const open = ranking.slice(0, 12).map((item) => ({
    title: item.task.title,
    category: item.task.category,
    status: item.task.status,
    deadline: iso(item.task.deadline),
    estimatedMinutes: item.task.estimatedMinutes,
    studiedMinutes: item.task.studiedMinutes || 0,
    difficulty: item.task.difficulty,
    importance: item.task.importance,
    schedmindPriority: item.level,
    schedmindRisk: riskById[item.task.id]?.level || "Low",
    overdue: item.overdue,
  }));

  const nowMs = now.getTime();
  const upcoming = sessions
    .filter((s) => s.status === "planned" && s.end > nowMs)
    .sort((a, b) => a.start - b.start)
    .slice(0, 6)
    .map((s) => ({ task: s.taskTitle, start: iso(s.start), minutes: s.minutes }));

  const focus = focusTaskId ? tasks.find((t) => t.id === focusTaskId) : null;
  return {
    now: iso(now),
    weeklyStudyHoursAvailable: Object.values(settings.availability || {}).reduce((sum, d) => {
      if (!d.enabled) return sum;
      const [sh, sm] = d.start.split(":").map(Number);
      const [eh, em] = d.end.split(":").map(Number);
      return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
    }, 0),
    openTasksByPriority: open,
    upcomingSessions: upcoming,
    habits: {
      estimateFactor: behavior.enoughTasks ? behavior.estimationFactor : null,
      missedSessionRate: behavior.enoughSessions ? Math.round(behavior.missedRate * 100) : null,
      bestStudyHours: behavior.peakLabels,
    },
    focusTask: focus
      ? {
          title: focus.title,
          description: (focus.description || "").slice(0, 300),
          category: focus.category,
          deadline: iso(focus.deadline),
          estimatedMinutes: focus.estimatedMinutes,
        }
      : null,
  };
}
