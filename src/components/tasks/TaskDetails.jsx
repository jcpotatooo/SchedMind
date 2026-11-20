import { format } from "date-fns";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
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
export default function TaskDetails({ task, onClose, onEdit, onDelete }) {
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
