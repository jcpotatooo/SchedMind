import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { saveSettings } from "../../services/settingsService.js";
import {
  DAY_NAMES,
  DAY_ORDER,
  SESSION_LENGTH_OPTIONS,
  defaultSettings,
  validateSettings,
  weeklyHours,
} from "../../lib/plan/settings.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import { controlClass } from "../../components/ui/Field.jsx";

// Available study hours (Feature 1/6). The scheduler only plans inside these hours.
export default function Settings() {
  const { user, displayName } = useAuth();
  const { settings: saved, usingDefaultSettings, schedule } = usePlan();

  const [form, setForm] = useState(saved);
  const [errors, setErrors] = useState({ general: "", days: {} });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  // If the saved settings arrive/change (e.g. after saving), show them.
  useEffect(() => setForm(saved), [saved]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function updateDay(day, changes) {
    setForm((prev) => ({
      ...prev,
      availability: { ...prev.availability, [day]: { ...prev.availability[day], ...changes } },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    const found = validateSettings(form);
    setErrors(found);
    if (found.general || Object.keys(found.days).length) return;

    setSaving(true);
    try {
      await saveSettings(user.uid, form);
      setNotice({
        type: "success",
        text: schedule && form.autoAdjust ? "Saved. Your schedule will adjust automatically." : "Settings saved.",
      });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) || "Could not save settings." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      <p className="text-sm text-ink-500">Signed in as {displayName}</p>

      <div className="mt-4 space-y-3">
        <Alert type={notice?.type || "info"}>{notice?.text}</Alert>
        {usingDefaultSettings && (
          <Alert type="info">
            You are using starting study hours (weekdays 7-10 PM, weekends 9 AM-12 PM). Adjust them below and save so
            your schedule fits your real life.
          </Alert>
        )}
      </div>

      <p className="mt-4 text-sm text-ink-500">
        Change your name or password on the <Link to="/profile" className="font-semibold text-brand-600">Profile page</Link>.
      </p>

      <form onSubmit={handleSave} noValidate className="mt-5 space-y-6">
        <section className="rounded-3xl bg-surface p-5 shadow-card">
          <h2 className="font-bold">Available study hours</h2>
          <p className="text-xs text-ink-500">
            SchedMind only plans study sessions inside these hours. About {weeklyHours(form).toFixed(1)} hours per week.
          </p>
          <Alert type="error">{errors.general}</Alert>

          <ul className="mt-4 space-y-3">
            {DAY_ORDER.map((day) => {
              const w = form.availability[day];
              return (
                <li key={day} className="rounded-2xl border border-ink-100 p-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <label className="flex w-36 items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" checked={w.enabled}
                        onChange={(e) => updateDay(day, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-brand-500" />
                      {DAY_NAMES[day]}
                    </label>
                    {w.enabled ? (
                      <div className="flex items-center gap-2 text-sm">
                        <input type="time" aria-label={`${DAY_NAMES[day]} start`} value={w.start}
                          onChange={(e) => updateDay(day, { start: e.target.value })}
                          className={`${controlClass(!!errors.days[day])} w-32`} />
                        <span className="text-ink-500">to</span>
                        <input type="time" aria-label={`${DAY_NAMES[day]} end`} value={w.end}
                          onChange={(e) => updateDay(day, { end: e.target.value })}
                          className={`${controlClass(!!errors.days[day])} w-32`} />
                      </div>
                    ) : (
                      <span className="text-sm text-ink-500">Day off</span>
                    )}
                  </div>
                  {errors.days[day] && <p className="mt-1 text-xs text-danger">{errors.days[day]}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-4 rounded-3xl bg-surface p-5 shadow-card">
          <h2 className="font-bold">Preferences</h2>
          <div>
            <label htmlFor="maxSession" className="mb-1.5 block text-sm font-semibold">Longest study session</label>
            <select id="maxSession" value={form.maxSessionMinutes}
              onChange={(e) => setForm({ ...form, maxSessionMinutes: Number(e.target.value) })}
              className={controlClass()}>
              {SESSION_LENGTH_OPTIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
            <p className="mt-1 text-xs text-ink-500">Long blocks are split into sessions of this length. Take a short break between them.</p>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={form.autoAdjust}
              onChange={(e) => setForm({ ...form, autoAdjust: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-brand-500" />
            <span>
              <strong>Adjust my schedule automatically</strong>
              <span className="block text-xs text-ink-500">
                Re-plans when you add tasks, change deadlines, miss sessions or change these hours.
              </span>
            </span>
          </label>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => { setForm(defaultSettings()); setErrors({ general: "", days: {} }); }}>
            Reset to starting hours
          </Button>
          <Button type="submit" loading={saving}>Save settings</Button>
        </div>
      </form>
    </div>
  );
}
