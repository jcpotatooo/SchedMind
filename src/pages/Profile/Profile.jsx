import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext.jsx";
import { changePassword, saveDisplayName } from "../../services/settingsService.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import Field, { controlClass } from "../../components/ui/Field.jsx";

// PROFILE: name (editable), email/role/joined (read-only), change password.
// Passwords are handled only by Firebase Auth; we never see or store them.
export default function Profile() {
  const { user, profile, displayName, isAdmin } = useAuth();
  const usesPassword = user.providerData.some((p) => p.providerId === "password");
  const initial = displayName.trim().charAt(0).toUpperCase() || "S";
  const joined = profile?.createdAt?.toDate?.();

  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>

      <div className="mt-4"><Alert type={notice?.type || "info"}>{notice?.text}</Alert></div>

      <section className="mt-4 flex items-center gap-4 rounded-3xl bg-surface p-5 shadow-card">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-500 text-2xl font-extrabold text-white" aria-hidden="true">{initial}</div>
        <dl className="min-w-0 text-sm">
          <dt className="sr-only">Name</dt>
          <dd className="truncate text-lg font-bold">{displayName}</dd>
          <dt className="sr-only">Email</dt>
          <dd className="truncate text-ink-500">{user.email}</dd>
          <dd className="mt-1 text-xs text-ink-500">
            {isAdmin ? "Administrator" : "Student"}{joined ? ` · joined ${format(joined, "MMM d, yyyy")}` : ""}
          </dd>
        </dl>
      </section>

      <NameForm user={user} current={displayName} onDone={setNotice} />
      {usesPassword ? (
        <PasswordForm user={user} onDone={setNotice} />
      ) : (
        <section className="mt-5 rounded-3xl bg-surface p-5 shadow-card">
          <h2 className="font-bold">Password</h2>
          <p className="mt-1 text-sm text-ink-500">You sign in with Google, so your password is managed by your Google account.</p>
        </section>
      )}
    </div>
  );
}

function NameForm({ user, current, onDone }) {
  const [name, setName] = useState(current);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return setError("Name must be at least 2 characters.");
    if (clean.length > 50) return setError("Name must be 50 characters or less.");
    setError("");
    setSaving(true);
    try {
      await saveDisplayName(user, clean);
      onDone({ type: "success", text: "Name updated." });
    } catch (err) {
      setError(friendlyError(err) || "Could not update your name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-3xl bg-surface p-5 shadow-card">
      <h2 className="font-bold">Display name</h2>
      <Field label="Name" htmlFor="profile-name" error={error}>
        <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={controlClass(!!error)} />
      </Field>
      <Field label="Email" htmlFor="profile-email">
        <input id="profile-email" value={user.email} readOnly disabled className={controlClass()} />
      </Field>
      <Button type="submit" loading={saving}>Save name</Button>
    </form>
  );
}

function PasswordForm({ user, onDone }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (!form.current) found.current = "Enter your current password.";
    if (form.next.length < 8) found.next = "New password must be at least 8 characters.";
    else if (form.next === form.current) found.next = "Choose a password different from the current one.";
    if (form.confirm !== form.next) found.confirm = "Passwords do not match.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await changePassword(user, form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      onDone({ type: "success", text: "Password changed." });
    } catch (err) {
      const wrong = ["auth/invalid-credential", "auth/wrong-password"].includes(err?.code);
      setErrors({ general: wrong ? "Your current password is incorrect." : friendlyError(err) || "Could not change your password." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-3xl bg-surface p-5 shadow-card">
      <h2 className="font-bold">Change password</h2>
      <Field label="Current password" htmlFor="pw-current" error={errors.current}>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" value={form.current} onChange={change} className={controlClass(!!errors.current)} />
      </Field>
      <Field label="New password" htmlFor="pw-next" error={errors.next}>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" value={form.next} onChange={change} className={controlClass(!!errors.next)} />
      </Field>
      <Field label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm}>
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={change} className={controlClass(!!errors.confirm)} />
      </Field>
      <Alert type="error">{errors.general}</Alert>
      <Button type="submit" loading={saving}>Change password</Button>
    </form>
  );
}
