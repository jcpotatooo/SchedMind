import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Flag, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { addGoal, deleteGoal, setGoalCompleted, updateGoal } from "../../services/goalService.js";
import { startOfWeekMs, studyMinutesSince } from "../../lib/activity.js";
import { goalProgress, validateGoal } from "../../lib/goals.js";
import { fmtMin } from "../../lib/plan/format.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Field, { controlClass } from "../../components/ui/Field.jsx";
import Modal from "../../components/ui/Modal.jsx";

// STUDY GOALS (Feature 12): a target date + a weekly study target.
// Progress = study minutes logged this week (focus sessions + sessions marked Done) / weekly target.
export default function Goals() {
  const { user } = useAuth();
  const { goals, focusSessions, sessions, now } = usePlan();

  const weekMinutes = useMemo(
    () => studyMinutesSince(focusSessions, sessions, startOfWeekMs(now)),
    [focusSessions, sessions, now]
  );

  const [editing, setEditing] = useState(null); // null | "new" | goal
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const sorted = [...goals].sort(
    (a, b) => Number(a.status === "completed") - Number(b.status === "completed") || a.targetDate - b.targetDate
  );

  async function toggleComplete(goal) {
    try {
      await setGoalCompleted(goal.id, goal.status !== "completed");
      setNotice({ type: "success", text: goal.status === "completed" ? "Goal reopened." : "Goal completed. Great work!" });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteGoal(deleting.id);
      setNotice({ type: "success", text: "Goal deleted." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Study Goals</h1>
          <p className="text-sm text-ink-500">You studied {fmtMin(weekMinutes)} this week</p>
        </div>
        <button type="button" onClick={() => setEditing("new")}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600">
          <Plus size={18} /> Add goal
        </button>
      </div>

      <div className="mt-4"><Alert type={notice?.type || "info"}>{notice?.text}</Alert></div>

      <div className="mt-5">
        {sorted.length === 0 ? (
          <EmptyState icon={Flag} title="No goals yet"
            text="Set an academic goal, like “Pass Biology finals”, with a target date and a weekly study target."
            action={<Button className="px-6" onClick={() => setEditing("new")}><Plus size={18} /> Add your first goal</Button>} />
        ) : (
          <ul className="space-y-3">
            {sorted.map((goal) => {
              const p = goalProgress(goal, weekMinutes, now);
              return (
                <li key={goal.id} className="rounded-2xl bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`font-semibold ${p.completed ? "text-ink-500 line-through" : ""}`}>{goal.title}</p>
                      {goal.description && <p className="text-sm text-ink-500">{goal.description}</p>}
                      <p className="mt-1 text-xs text-ink-500">
                        Target date {format(goal.targetDate, "MMM d, yyyy")} ·{" "}
                        {p.completed ? "completed" : p.overdue ? <span className="font-semibold text-danger">date passed</span> : `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"} left`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-ink-500">
                      <span>This week: {fmtMin(p.weekMinutes)} of {fmtMin(p.target)}</span>
                      <span className="font-semibold text-ink-700">{p.percent}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar"
                      aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Weekly progress for ${goal.title}`}>
                      <div className={`h-full rounded-full ${p.percent >= 100 ? "bg-success" : "bg-brand-500"}`} style={{ width: `${p.percent}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                    <button type="button" onClick={() => toggleComplete(goal)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                      {p.completed ? <><RotateCcw size={14} /> Reopen</> : <><CheckCircle2 size={14} /> Mark completed</>}
                    </button>
                    <span className="flex-1" />
                    <button type="button" onClick={() => setEditing(goal)} aria-label={`Edit ${goal.title}`}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100/60"><Pencil size={16} /></button>
                    <button type="button" onClick={() => setDeleting(goal)} aria-label={`Delete ${goal.title}`}
                      className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-danger"><Trash2 size={16} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing && (
        <GoalForm goal={editing === "new" ? null : editing} onClose={() => setEditing(null)}
          onSave={async (form) => {
            if (editing === "new") await addGoal(user.uid, form);
            else await updateGoal(editing.id, form);
            setEditing(null);
            setNotice({ type: "success", text: editing === "new" ? "Goal added." : "Goal updated." });
          }} />
      )}
      {deleting && (
        <Modal title="Delete goal?" onClose={() => !busy && setDeleting(null)}>
          <p className="text-sm text-ink-700">“<strong>{deleting.title}</strong>” will be permanently deleted.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GoalForm({ goal, onSave, onClose }) {
  const [form, setForm] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    targetDate: goal ? format(goal.targetDate, "yyyy-MM-dd") : "",
    weeklyHours: goal ? String(goal.weeklyTargetMinutes / 60) : "5",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const found = validateGoal(form, { isNew: !goal });
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(form);
    } catch (err) {
      setSubmitError(friendlyError(err) || "Could not save the goal.");
      setSaving(false);
    }
  }

  return (
    <Modal title={goal ? "Edit goal" : "Add goal"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Goal" htmlFor="goal-title" error={errors.title}>
          <input id="goal-title" name="title" value={form.title} onChange={change}
            placeholder="e.g. Pass Biology finals" className={controlClass(!!errors.title)} />
        </Field>
        <Field label="Description (optional)" htmlFor="goal-desc" error={errors.description}>
          <textarea id="goal-desc" name="description" rows={2} value={form.description} onChange={change}
            className={`${controlClass(!!errors.description)} h-auto py-2`} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Target date" htmlFor="goal-date" error={errors.targetDate}>
            <input id="goal-date" name="targetDate" type="date" value={form.targetDate} onChange={change}
              className={controlClass(!!errors.targetDate)} />
          </Field>
          <Field label="Weekly study target (hours)" htmlFor="goal-hours" error={errors.weeklyHours}>
            <input id="goal-hours" name="weeklyHours" type="number" step="0.5" min="0.5" max="70"
              value={form.weeklyHours} onChange={change} className={controlClass(!!errors.weeklyHours)} />
          </Field>
        </div>
        <Alert type="error">{submitError}</Alert>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{goal ? "Save changes" : "Add goal"}</Button>
        </div>
      </form>
    </Modal>
  );
}
