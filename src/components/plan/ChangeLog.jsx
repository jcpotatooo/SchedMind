import { format } from "date-fns";
import { History } from "lucide-react";

// "Why did my schedule change?" (Feature 6 + 7): newest change first.
export default function ChangeLog({ entries }) {
  if (!entries?.length) return null;
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-card" aria-label="Schedule updates">
      <div className="flex items-center gap-2">
        <History size={18} className="text-brand-600" />
        <h2 className="font-bold">Schedule updates</h2>
      </div>
      <ul className="mt-4 space-y-4">
        {entries.slice(0, 5).map((entry) => (
          <li key={entry.at} className="text-sm">
            <p className="text-xs font-semibold text-ink-500">{format(entry.at, "MMM d, h:mm a")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {entry.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            {entry.moves?.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-500">
                {entry.moves.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
