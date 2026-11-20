import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "../../services/authService.js";

// Drop this anywhere (dashboard header, settings page...). ProtectedRoute then
// automatically sends the student back to /login.
export default function LogoutButton({ className = "" }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await logout();
    } catch (error) {
      console.error(error);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100/60 disabled:opacity-60 ${className}`}
    >
      <LogOut size={16} /> {busy ? "Signing out..." : "Log out"}
    </button>
  );
}
