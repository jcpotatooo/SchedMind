import { Clock, Pencil, Trash2, Hourglass, Check } from "lucide-react";
import { PriorityChip, RiskChip } from "../plan/Chips.jsx";
import {
  STATUSES,
  statusInfo,
  isOverdue,
  formatDeadline,
  formatMinutes,
  levelLabel,
} from "../../lib/taskConstants.js";

// One task in the list. Title opens the details dialog.
export default function TaskCard({ task, priority, risk, onOpen, onEdit, onDelete, onStatusChange }) {
  const overdue = isOverdue(task);
  const status = statusInfo(task.status);
  const done = task.status === "done";

  return (
    <article className="rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onOpen(task)}
            className={`block max-w-full truncate text-left text-base font-semibold hover:text-brand-600 ${
              done ? "text-ink-500 line-through" : ""
            }`}>
            {task.title}
          </button>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
              {task.category}
            </span>
            {task.subject && <span>{task.subject}</span>}
            {priority && !done && <PriorityChip level={priority.level} />}
            {risk && !done && risk.level !== "Low" && <RiskChip level={risk.level} />}
            {overdue && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">Overdue</span>
            )}
            {!done && (task.studiedMinutes || 0) >= (task.estimatedMinutes || 0) && (task.estimatedMinutes || 0) > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">Study time covered</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {formatDeadline(task.deadline)}
            </span>
            <span className="inline-flex items-center gap-1" title="Time studied / estimated">
              <Hourglass size={14} />
              {done
                ? formatMinutes(task.actualMinutes || task.studiedMinutes || task.estimatedMinutes)
                : (task.studiedMinutes || 0) > 0
                ? `${formatMinutes(task.studiedMinutes)} / ${formatMinutes(task.estimatedMinutes)}`
                : formatMinutes(task.estimatedMinutes)}
            </span>
            <span>Importance: {levelLabel(task.importance)}</span>
            <span>Difficulty: {levelLabel(task.difficulty)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <div className="flex items-center gap-2">
          <select aria-label={`Status of ${task.title}`} value={task.status}
            onChange={(e) => onStatusChange(task, e.target.value)}
            className="h-9 rounded-lg border border-ink-100 bg-page px-2 text-xs font-medium outline-none focus:border-brand-500">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {!done && (task.studiedMinutes || 0) >= (task.estimatedMinutes || 0) && (task.estimatedMinutes || 0) > 0 && (
            <button
              type="button"
              onClick={() => onStatusChange(task, "done")}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              title="Mark this task as finished"
            >
              <Check size={14} /> Complete
            </button>
          )}
        </div>

        <div className="flex gap-1">
          <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}
            className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100/60 hover:text-ink-900">
            <Pencil size={16} />
          </button>
          <button type="button" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}
            className="rounded-lg p-2 text-ink-500 transition hover:bg-red-50 hover:text-danger">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
