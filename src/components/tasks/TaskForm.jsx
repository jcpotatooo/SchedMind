import { useState } from "react";
import { format } from "date-fns";
import Modal from "../ui/Modal.jsx";
import Field, { controlClass } from "../ui/Field.jsx";
import Button from "../ui/Button.jsx";
import Alert from "../ui/Alert.jsx";
import { CATEGORIES, STATUSES, LEVELS } from "../../lib/taskConstants.js";
import { validateTask } from "../../lib/taskValidators.js";
import { friendlyError } from "../../lib/authErrors.js";

const emptyForm = {
  title: "",
  subject: "",
  description: "",
  category: "Assignment",
  deadline: "",
  difficulty: 2,
  importance: 2,
  estimatedMinutes: "60",
  status: "todo",
};

// Turns a saved task into the string values the form inputs need.
function toForm(task) {
  if (!task) return emptyForm;
  return {
    title: task.title,
    subject: task.subject || "",
    description: task.description || "",
    category: task.category,
    deadline: task.deadline ? format(task.deadline, "yyyy-MM-dd'T'HH:mm") : "",
    difficulty: task.difficulty,
    importance: task.importance,
    estimatedMinutes: String(task.estimatedMinutes),
    status: task.status,
  };
}

// Add / edit dialog. `task` = null for a new task. `onSave(payload)` must return a Promise.
export default function TaskForm({ task, onSave, onClose }) {
  const [form, setForm] = useState(() => toForm(task));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  const handleChange = (e) => setField(e.target.name, e.target.value);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateTask(form, { isNew: !task });
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSubmitError("");
    try {
      await onSave({
        title: form.title.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        deadline: new Date(form.deadline),
        difficulty: Number(form.difficulty),
        importance: Number(form.importance),
        estimatedMinutes: Number(form.estimatedMinutes),
        status: form.status,
      });
    } catch (error) {
      setSubmitError(friendlyError(error) || "Could not save the task.");
      setSaving(false);
    }
  }

  return (
    <Modal title={task ? "Edit task" : "Add task"} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <input id="title" name="title" value={form.title} onChange={handleChange}
            placeholder="e.g. Read Chapter 5" className={controlClass(!!errors.title)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" error={errors.category}>
            <select id="category" name="category" value={form.category} onChange={handleChange}
              className={controlClass(!!errors.category)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Subject (optional)" htmlFor="subject" error={errors.subject}>
            <input id="subject" name="subject" value={form.subject} onChange={handleChange}
              placeholder="e.g. Biology" className={controlClass(!!errors.subject)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Deadline" htmlFor="deadline" error={errors.deadline}>
            <input id="deadline" name="deadline" type="datetime-local" value={form.deadline}
              onChange={handleChange} className={controlClass(!!errors.deadline)} />
          </Field>
          <Field label="Estimated time (minutes)" htmlFor="estimatedMinutes" error={errors.estimatedMinutes}
            hint="How long you think it will take.">
            <input id="estimatedMinutes" name="estimatedMinutes" type="number" min="5" step="5"
              value={form.estimatedMinutes} onChange={handleChange}
              className={controlClass(!!errors.estimatedMinutes)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Importance" error={errors.importance}>
            <Segmented value={form.importance} onChange={(v) => setField("importance", v)} />
          </Field>
          <Field label="Difficulty" error={errors.difficulty}>
            <Segmented value={form.difficulty} onChange={(v) => setField("difficulty", v)} />
          </Field>
        </div>

        <Field label="Status" htmlFor="status" error={errors.status}>
          <select id="status" name="status" value={form.status} onChange={handleChange}
            className={controlClass(!!errors.status)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>

        <Field label="Notes (optional)" htmlFor="description" error={errors.description}>
          <textarea id="description" name="description" rows={3} value={form.description}
            onChange={handleChange} placeholder="Anything you want to remember..."
            className={`${controlClass(!!errors.description)} h-auto py-2`} />
        </Field>

        <Alert type="error">{submitError}</Alert>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{task ? "Save changes" : "Add task"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Three buttons: Low / Medium / High.
function Segmented({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl bg-page p-1">
      {LEVELS.map((level) => {
        const active = Number(value) === level.value;
        return (
          <button key={level.value} type="button" aria-pressed={active}
            onClick={() => onChange(level.value)}
            className={`h-9 flex-1 rounded-lg text-sm font-medium transition ${
              active ? "bg-surface text-brand-700 shadow-card" : "text-ink-500 hover:text-ink-900"
            }`}>
            {level.label}
          </button>
        );
      })}
    </div>
  );
}
