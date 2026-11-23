// Study time is cut into 30-minute "slots". The scheduler hands slots out to
// tasks one by one, so two sessions can never overlap.
export const SLOT_MINUTES = 30;
const SLOT_MS = SLOT_MINUTES * 60000;

const toMinutes = (hm) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

// Next :00 or :30 after "now" (in ms).
function nextSlotStart(nowMs) {
  const d = new Date(nowMs);
  d.setSeconds(0, 0);
  const rest = d.getMinutes() % SLOT_MINUTES;
  if (rest !== 0 || d.getTime() <= nowMs) d.setMinutes(d.getMinutes() + (rest === 0 ? SLOT_MINUTES : SLOT_MINUTES - rest));
  return d.getTime();
}

// All free study slots from now until `horizonDays`, using the student's weekly hours.
// extraMinutes (Rescue Mode) stretches the end of every study window.
export function buildSlots(settings, now, extraMinutes = 0, horizonDays = 60) {
  const first = nextSlotStart(now.getTime());
  const slots = [];

  for (let i = 0; i < horizonDays; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const window = settings.availability[day.getDay()];
    if (!window || !window.enabled) continue;

    const startMin = toMinutes(window.start);
    const rawEnd = window.end === "00:00" ? 24 * 60 : toMinutes(window.end);
    const endMin = Math.min(rawEnd + extraMinutes, 24 * 60);
    for (let m = startMin; m + SLOT_MINUTES <= endMin; m += SLOT_MINUTES) {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m).getTime();
      if (start < first) continue; // already in the past
      slots.push({ start, end: start + SLOT_MS });
    }
  }
  return slots;
}

// Minutes of study time that finish on or before the deadline.
export function capacityMinutes(slots, deadlineMs) {
  let count = 0;
  for (const slot of slots) {
    if (slot.end > deadlineMs) break; // slots are in time order
    count++;
  }
  return count * SLOT_MINUTES;
}

// Study time that is already used by a session the student marked Done or Missed
// must stay used unless the task is already finished or the session was completed early.
// Completed tasks and early-finished future sessions NEVER block new tasks from using slots.
export function removeBlocked(slots, sessions, nowMs, tasks = []) {
  const doneTaskIds = new Set((tasks || []).filter((t) => t.status === "done").map((t) => t.id));
  const blocked = (sessions || []).filter((s) => {
    if (s.status === "planned") return false;
    // Completed tasks never block future study slots
    if (doneTaskIds.has(s.taskId)) return false;
    // Sessions already marked done whose planned slot is in the future don't block
    if (s.status === "done" && s.start > nowMs) return false;
    return s.end > nowMs;
  });
  if (blocked.length === 0) return slots;
  return slots.filter((slot) => !blocked.some((s) => slot.start < s.end && slot.end > s.start));
}
