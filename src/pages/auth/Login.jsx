import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Alert from "../../components/ui/Alert.jsx";
import GoogleIcon from "../../components/ui/GoogleIcon.jsx";
import { validateEmail, validatePassword } from "../../lib/validators.js";
import { loginWithEmail, loginWithGoogle } from "../../services/authService.js";
import { friendlyError } from "../../lib/authErrors.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const busy = loading || googleLoading;

  // NOTE: after a successful login we don't navigate manually. <PublicRoute>
  // notices the user is logged in and redirects to the dashboard (or the page
  // they originally wanted).
  async function handleSubmit(e) {
    e.preventDefault();
    const next = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError("");
    if (next.email || next.password) return;

    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (error) {
      setFormError(friendlyError(error));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setFormError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      setFormError(friendlyError(error)); // "" if the user just closed the popup
      setGoogleLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome to SchedMind" subtitle="Sign in to continue">
      <div className="space-y-5">
        <Button type="button" variant="outline" onClick={handleGoogle} loading={googleLoading} disabled={busy}>
          {!googleLoading && <GoogleIcon />} Continue with Google
        </Button>

        <div className="flex items-center gap-4 text-xs font-semibold text-ink-500">
          <span className="h-px flex-1 bg-ink-100" /> OR <span className="h-px flex-1 bg-ink-100" />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <Input
            id="email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Alert type="error">{formError}</Alert>
          <Button type="submit" loading={loading} disabled={busy}>Sign in</Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-ink-700 hover:text-brand-600">
            Forgot password?
          </Link>
          <span className="text-ink-500">
            Need an account?{" "}
            <Link to="/register" className="font-bold text-ink-900 hover:text-brand-600">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
