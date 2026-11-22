import { format } from "date-fns";
import { PriorityChip, RiskChip } from "./Chips.jsx";

// Ranked tasks with the WHY behind every rank and every risk level.
export default function PriorityList({ ranking, riskById }) {
  return (
    <ol className="space-y-3">
      {ranking.map((item) => {
        const risk = riskById[item.task.id];
        return (
          <li key={item.task.id} className="rounded-2xl bg-surface p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-ink-700">
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.task.title}</p>
                <p className="text-xs text-ink-500">
                  {item.task.category} · due {format(item.task.deadline, "MMM d, h:mm a")} · score {item.score}/100
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PriorityChip level={item.level} />
                  {risk && <RiskChip level={risk.level} />}
                </div>

                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-brand-600">Why this rank?</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-700">
                    {item.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                  {item.rankNote && <p className="mt-2 text-ink-700">{item.rankNote}</p>}
                  {risk && (
                    <div className="mt-3 rounded-xl bg-page p-3">
                      <p className="font-semibold">{risk.level} risk</p>
                      <p className="text-ink-700">{risk.explanation}</p>
                      <p className="mt-1 text-ink-700"><strong>Suggested action:</strong> {risk.action}</p>
                    </div>
                  )}
                </details>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
