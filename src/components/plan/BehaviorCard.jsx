import { Brain } from "lucide-react";

// "What SchedMind learned about you" (Behavior Learning, Feature 2).
// Honest about when there is not enough data yet.
export default function BehaviorCard({ behavior }) {
  const b = behavior;
  const rows = [
    {
      label: "Estimated vs actual time",
      text: b.enoughTasks
        ? `Your finished tasks took ${b.estimationFactor}× your estimates on average (${b.taskSamples} tasks), so new plans add that extra time.`
        : `Not enough data yet (${b.taskSamples} of 3 finished tasks with study time logged). Mark study sessions Done, then finish the task.`,
    },
    {
      label: "Missed sessions",
      text: b.enoughSessions
        ? `You missed ${b.missedCount} of ${b.resolvedSessions} sessions (${Math.round(b.missedRate * 100)}%), so only ${Math.round(b.reliability * 100)}% of your free time is counted on.`
        : `Not enough data yet (${b.resolvedSessions} of 5 sessions marked Done or Missed).`,
    },
    {
      label: "Productive hours",
      text: b.peakLabels.length
        ? `You finish most sessions around ${b.peakLabels.join(" and ")}. Hard tasks are placed there first.`
        : "Not enough data yet. Complete at least 5 sessions, 2 in the same hour.",
    },
  ];

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-card" aria-label="What SchedMind learned">
      <div className="flex items-center gap-2">
        <Brain size={18} className="text-brand-600" />
        <h2 className="font-bold">What SchedMind learned about you</h2>
      </div>
      <p className="mt-1 text-xs text-ink-500">Simple rules based on your own history. This is not machine learning.</p>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="font-semibold">{row.label}</dt>
            <dd className="text-ink-700">{row.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
