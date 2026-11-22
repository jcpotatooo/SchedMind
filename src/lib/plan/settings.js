// The student's available study hours + scheduling preferences.
// Saved inside the student's own users/{uid} document, under "settings".
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Display order: Monday first.
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const SESSION_LENGTH_OPTIONS = [30, 60, 90, 120];

// Starting values used until the student saves their own (the app tells them so).
export function defaultSettings() {
  const availability = {};
  for (let day = 0; day < 7; day++) {
    const weekday = day >= 1 && day <= 5;
    availability[day] = weekday
      ? { enabled: true, start: "19:00", end: "22:00" }
      : { enabled: true, start: "09:00", end: "12:00" };
  }
  return { availability, maxSessionMinutes: 60, autoAdjust: true };
}

// Fill any missing pieces with defaults, so old/partial data never crashes the app.
export function normalizeSettings(raw) {
  const base = defaultSettings();
  const availability = {};
  for (let day = 0; day < 7; day++) {
    availability[day] = { ...base.availability[day], ...(raw?.availability?.[day] || {}) };
  }
  return {
    availability,
    maxSessionMinutes: SESSION_LENGTH_OPTIONS.includes(raw?.maxSessionMinutes)
      ? raw.maxSessionMinutes
      : base.maxSessionMinutes,
    autoAdjust: raw?.autoAdjust !== false,
  };
}

const toMinutes = (hm) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

// Returns { general: "message" | "", days: { [dayIndex]: "message" } }
export function validateSettings(settings) {
  const days = {};
  let enabledCount = 0;
  for (let day = 0; day < 7; day++) {
    const w = settings.availability[day];
    if (!w.enabled) continue;
    enabledCount++;
    if (!w.start || !w.end) days[day] = "Choose a start and end time.";
    else if (toMinutes(w.end) - toMinutes(w.start) < 30) days[day] = "End must be at least 30 minutes after start.";
  }
  return {
    general: enabledCount === 0 ? "Turn on at least one study day." : "",
    days,
  };
}

export function weeklyHours(settings) {
  let minutes = 0;
  for (let day = 0; day < 7; day++) {
    const w = settings.availability[day];
    if (w.enabled && w.start && w.end) minutes += Math.max(0, toMinutes(w.end) - toMinutes(w.start));
  }
  return minutes / 60;
}
