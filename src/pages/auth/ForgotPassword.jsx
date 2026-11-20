import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { validateEmail } from "../../lib/validators.js";
import { sendResetEmail } from "../../services/authService.js";
import { friendlyError } from "../../lib/authErrors.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const message = validateEmail(email);
    setError(message);
    setFormError("");
    setSuccess("");
    if (message) return;

    setLoading(true);
    try {
      await sendResetEmail(email);
      // Same wording whether or not the email exists, so strangers can't use
      // this form to find out who has an account.
      setSuccess(`If an account exists for ${email.trim()}, a reset link has been sent. Check your inbox (and spam folder).`);
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input id="email" label="Email" icon={Mail} type="email" autoComplete="email"
          placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} error={error} />
        <Alert type="error">{formError}</Alert>
        <Alert type="success">{success}</Alert>
        <Button type="submit" loading={loading}>Send reset link</Button>
      </form>

      <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-ink-700 hover:text-brand-600">
        <ArrowLeft size={16} /> Return to login
      </Link>
    </AuthLayout>
  );
}
