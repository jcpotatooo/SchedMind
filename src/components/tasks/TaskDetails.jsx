import { format } from "date-fns";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import { PriorityChip, RiskChip } from "../plan/Chips.jsx";
import {
  statusInfo,
  isOverdue,
  formatDeadline,
  formatMinutes,
  levelLabel,
} from "../../lib/taskConstants.js";

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-100 py-2.5 text-sm last:border-0">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

// Read-only "view task details" dialog with shortcuts to edit / delete.
export default function TaskDetails({ task, priority, risk, onClose, onEdit, onDelete }) {
  return (
    <Modal title="Task details" onClose={onClose}>
      <h3 className="text-lg font-bold">{task.title}</h3>

      <dl className="mt-3">
        <Row label="Category">{task.category}</Row>
        <Row label="Subject">{task.subject || "-"}</Row>
        <Row label="Status">{statusInfo(task.status).label}</Row>
        <Row label="Deadline">
          {formatDeadline(task.deadline)}
          {isOverdue(task) && <span className="ml-2 text-danger">(overdue)</span>}
        </Row>
        <Row label="Estimated time">{formatMinutes(task.estimatedMinutes)}</Row>
        <Row label="Importance">{levelLabel(task.importance)}</Row>
        <Row label="Difficulty">{levelLabel(task.difficulty)}</Row>
        {task.createdAt && <Row label="Created">{format(task.createdAt, "MMM d, yyyy")}</Row>}
        {task.completedAt && <Row label="Completed">{format(task.completedAt, "MMM d, yyyy · h:mm a")}</Row>}
      </dl>

      {priority && task.status !== "done" && (
        <div className="mt-4 rounded-2xl bg-page p-4 text-sm text-ink-700">
          <div className="mb-2 flex flex-wrap gap-2">
            <PriorityChip level={priority.level} />
            {risk && <RiskChip level={risk.level} />}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Why this priority</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {priority.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {priority.rankNote && <p className="mt-2">{priority.rankNote}</p>}
          {risk && (
            <p className="mt-3">
              <strong>Risk:</strong> {risk.explanation} <strong>Suggested action:</strong> {risk.action}
            </p>
          )}
        </div>
      )}

      {task.description && (
        <div className="mt-4 rounded-2xl bg-page p-4 text-sm text-ink-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">Notes</p>
          <p className="whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => onDelete(task)}>Delete</Button>
        <Button onClick={() => onEdit(task)}>Edit</Button>
      </div>
    </Modal>
  );
}
