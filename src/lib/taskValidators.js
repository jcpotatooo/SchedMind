import { CATEGORIES, STATUSES, LEVELS } from "./taskConstants.js";

// Validates the task form. Returns an object of { field: "message" } (empty = valid).
// isNew: new tasks can't have a deadline in the past (existing tasks may become overdue).
export function validateTask(form, { isNew = true } = {}) {
  const errors = {};

  if (!form.title.trim()) errors.title = "Title is required.";
  else if (form.title.trim().length > 100) errors.title = "Title must be 100 characters or less.";

  if (form.subject.trim().length > 50) errors.subject = "Subject must be 50 characters or less.";
  if (form.description.trim().length > 500) errors.description = "Notes must be 500 characters or less.";

  if (!CATEGORIES.includes(form.category)) errors.category = "Choose a category.";
  if (!STATUSES.some((s) => s.value === form.status)) errors.status = "Choose a status.";
  if (!LEVELS.some((l) => l.value === Number(form.difficulty))) errors.difficulty = "Choose a difficulty.";
  if (!LEVELS.some((l) => l.value === Number(form.importance))) errors.importance = "Choose an importance level.";

  if (!form.deadline) {
    errors.deadline = "Deadline is required.";
  } else {
    const date = new Date(form.deadline);
    if (Number.isNaN(date.getTime())) errors.deadline = "Enter a valid deadline.";
    else if (isNew && date < new Date()) errors.deadline = "Deadline can't be in the past.";
  }

  const minutes = Number(form.estimatedMinutes);
  if (!form.estimatedMinutes && form.estimatedMinutes !== 0) errors.estimatedMinutes = "Estimated time is required.";
  else if (!Number.isInteger(minutes) || minutes < 5) errors.estimatedMinutes = "Enter at least 5 minutes (whole number).";
  else if (minutes > 10080) errors.estimatedMinutes = "That is more than a week. Split it into smaller tasks.";

  return errors;
}
