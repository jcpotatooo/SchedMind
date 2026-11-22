import { startOfDayMs } from "./activity.js";

const DAY_MS = 86400000;

// Progress of one study goal.
//  weekMinutes = study minutes logged this week (Monday to now): focus sessions + sessions marked Done
//  percent     = weekMinutes compared with the weekly target
//  daysLeft    = days until the target date (negative = date passed)
export function goalProgress(goal, weekMinutes, now) {
  const target = goal.weeklyTargetMinutes || 0;
  const daysLeft = Math.ceil((startOfDayMs(goal.targetDate) - startOfDayMs(now)) / DAY_MS);
  const completed = goal.status === "completed";
  return {
    target,
    weekMinutes,
    percent: target > 0 ? Math.min(100, Math.round((weekMinutes / target) * 100)) : 0,
    daysLeft,
    completed,
    overdue: !completed && daysLeft < 0,
  };
}

// Form validation. Returns { field: "message" } (empty = valid).
export function validateGoal(form, { isNew = true } = {}) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  else if (form.title.trim().length > 100) errors.title = "Title must be 100 characters or less.";
  if (form.description.trim().length > 300) errors.description = "Description must be 300 characters or less.";

  if (!form.targetDate) errors.targetDate = "Choose a target date.";
  else {
    const date = new Date(`${form.targetDate}T23:59`);
    if (Number.isNaN(date.getTime())) errors.targetDate = "Enter a valid date.";
    else if (isNew && date < new Date()) errors.targetDate = "Target date can't be in the past.";
  }

  const hours = Number(form.weeklyHours);
  if (form.weeklyHours === "" || Number.isNaN(hours)) errors.weeklyHours = "Enter your weekly study target.";
  else if (hours < 0.5 || hours > 70) errors.weeklyHours = "Choose between 0.5 and 70 hours per week.";
  return errors;
}
