import { useEffect, useMemo, useState } from "react";
import { Check, Flame, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { addHabit, deleteHabit, setHabitDone, updateHabit } from "../../services/habitService.js";
import { dayKey } from "../../lib/activity.js";
import { habitStats } from "../../lib/habits.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Field, { controlClass } from "../../components/ui/Field.jsx";
import Modal from "../../components/ui/Modal.jsx";

// STUDY HABITS: small daily routines (for example "Review notes", "Read 10 pages").
export default function Habits() {
  const { user } = useAuth();
  const { habits, habitLogs, now } = usePlan();
  const stats = useMemo(() => habitStats(habits, habitLogs, now), [habits, habitLogs, now]);
  const today = dayKey(now);

  const [editing, setEditing] = useState(null); // null | "new" | habit object
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  async function toggle(item) {
    try {
      await setHabitDone(user.uid, item.habit.id, today, !item.doneToday);
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await deleteHabit(user.uid, deleting.id);
      setNotice({ type: "success", text: "Habit deleted." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  const sorted = [...stats.items].sort((a, b) => a.habit.name.localeCompare(b.habit.name));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Habits</h1>
          <p className="text-sm text-ink-500">{stats.doneToday} of {stats.total} done today</p>
        </div>
        <button type="button" onClick={() => setEditing("new")}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600">
          <Plus size={18} /> Add habit
        </button>
      </div>

      <div className="mt-4"><Alert type={notice?.type || "info"}>{notice?.text}</Alert></div>

      <div className="mt-5">
        {sorted.length === 0 ? (
          <EmptyState icon={Target} title="No habits yet"
            text="Build a daily study routine, like reviewing notes or reading for 20 minutes. Check it off each day to grow your streak."
            action={<Button className="px-6" onClick={() => setEditing("new")}><Plus size={18} /> Add your first habit</Button>} />
        ) : (
          <ul className="space-y-3">
            {sorted.map((item) => (
              <li key={item.habit.id} className="rounded-2xl bg-surface p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggle(item)} aria-pressed={item.doneToday}
                    aria-label={`${item.doneToday ? "Uncheck" : "Check"} ${item.habit.name} for today`}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition ${
                      item.doneToday ? "border-brand-500 bg-brand-500 text-white" : "border-ink-100 text-transparent hover:border-brand-500"
                    }`}>
                    <Check size={20} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${item.doneToday ? "text-ink-500 line-through" : ""}`}>{item.habit.name}</p>
                    {item.habit.note && <p className="truncate text-xs text-ink-500">{item.habit.note}</p>}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-orange" title="Current streak">
                    <Flame size={16} /> {item.streak}d
                  </span>
                  <button type="button" onClick={() => setEditing(item.habit)} aria-label={`Edit ${item.habit.name}`}
                    className="rounded-lg p-2 text-ink-500 hover:bg-ink-100/60"><Pencil size={16} /></button>
                  <button type="button" onClick={() => setDeleting(item.habit)} aria-label={`Delete ${item.habit.name}`}
                    className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-danger"><Trash2 size={16} /></button>
                </div>
                <div className="mt-3 flex justify-between gap-1 border-t border-ink-100 pt-3" aria-label="Last 7 days">
                  {item.week.map((d) => (
                    <div key={d.key} className="flex flex-1 flex-col items-center gap-1 text-[10px] text-ink-500">
                      <span className={`h-3 w-3 rounded-full ${d.done ? "bg-brand-500" : "bg-ink-100"}`} />
                      {d.label}
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <HabitForm habit={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (editing === "new") await addHabit(user.uid, values);
            else await updateHabit(editing.id, values);
            setEditing(null);
            setNotice({ type: "success", text: editing === "new" ? "Habit added." : "Habit updated." });
          }} />
      )}
      {deleting && (
        <Modal title="Delete habit?" onClose={() => !busy && setDeleting(null)}>
          <p className="text-sm text-ink-700">“<strong>{deleting.name}</strong>” and all its check-ins will be permanently deleted.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function HabitForm({ habit, onSave, onClose }) {
  const [name, setName] = useState(habit?.name || "");
  const [note, setNote] = useState(habit?.note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Habit name is required.");
    if (name.trim().length > 60) return setError("Name must be 60 characters or less.");
    if (note.trim().length > 100) return setError("Note must be 100 characters or less.");
    setError("");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), note: note.trim() });
    } catch (err) {
      setError(friendlyError(err) || "Could not save the habit.");
      setSaving(false);
    }
  }

  return (
    <Modal title={habit ? "Edit habit" : "Add habit"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Habit" htmlFor="habit-name">
          <input id="habit-name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Review class notes" className={controlClass(!!error)} />
        </Field>
        <Field label="Note (optional)" htmlFor="habit-note">
          <input id="habit-note" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 20 minutes after dinner" className={controlClass()} />
        </Field>
        <Alert type="error">{error}</Alert>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{habit ? "Save" : "Add habit"}</Button>
        </div>
      </form>
    </Modal>
  );
}
