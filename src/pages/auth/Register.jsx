import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Lock, ArrowLeft } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirm,
} from "../../lib/validators.js";
import { registerWithEmail } from "../../services/authService.js";
import { friendlyError } from "../../lib/authErrors.js";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  // One handler for all fields: updates the field whose "name" matches.
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    };
    setErrors(next);
    setFormError("");
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      // Creates the Firebase account + users/{uid} profile with role "student".
      // The role is NEVER read from this form, so nobody can register as admin.
      await registerWithEmail({ name: form.name, email: form.email, password: form.password });
      // <PublicRoute> redirects to the dashboard once the user is logged in.
    } catch (error) {
      setFormError(friendlyError(error));
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start planning smarter with SchedMind">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input id="name" name="name" label="Full name" icon={User} autoComplete="name"
          placeholder="Juan Dela Cruz" value={form.name} onChange={handleChange} error={errors.name} />
        <Input id="email" name="email" label="Email" icon={Mail} type="email" autoComplete="email"
          placeholder="you@example.com" value={form.email} onChange={handleChange} error={errors.email} />
        <Input id="password" name="password" label="Password" icon={Lock} type="password"
          autoComplete="new-password" placeholder="At least 8 characters"
          value={form.password} onChange={handleChange} error={errors.password} />
        <Input id="confirm" name="confirm" label="Confirm password" icon={Lock} type="password"
          autoComplete="new-password" placeholder="Re-enter your password"
          value={form.confirm} onChange={handleChange} error={errors.confirm} />
        <Alert type="error">{formError}</Alert>
        <Button type="submit" loading={loading}>Create account</Button>
      </form>

      <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-600">
        <ArrowLeft size={16} /> Return to login
      </Link>
    </AuthLayout>
  );
}
