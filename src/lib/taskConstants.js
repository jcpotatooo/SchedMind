import { format, isBefore } from "date-fns";

// Shared lists + helpers for tasks. Phase 3 (scheduling) will reuse these numbers.
export const CATEGORIES = ["Assignment", "Project", "Quiz", "Examination", "Other"];

export const STATUSES = [
  { value: "todo", label: "To Do", dot: "bg-ink-300" },
  { value: "in_progress", label: "In Progress", dot: "bg-accent-blue" },
  { value: "done", label: "Done", dot: "bg-brand-500" },
];

// Difficulty and importance are stored as numbers (1-3) so Phase 3 can do math with them.
export const LEVELS = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

export const statusInfo = (value) => STATUSES.find((s) => s.value === value) || STATUSES[0];
export const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label || "-";

// A task is overdue when its deadline passed and it is not done.
export function isOverdue(task, now = new Date()) {
  return task.status !== "done" && !!task.deadline && isBefore(task.deadline, now);
}

export function formatDeadline(date) {
  return date ? format(date, "MMM d, yyyy · h:mm a") : "No deadline";
}

export function formatMinutes(minutes) {
  if (!minutes) return "-";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
