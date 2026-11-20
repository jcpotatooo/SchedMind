import { Loader2 } from "lucide-react";

// Reusable button. variant: "primary" (teal) | "outline" | "ghost" | "danger".
// loading=true shows a spinner and disables the button (prevents double submits).
// PHASE 2 CHANGE: only added the "danger" variant (used by the delete confirmation).
const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 shadow-card",
  outline: "border border-ink-100 bg-white text-ink-900 hover:bg-page",
  ghost: "text-ink-700 hover:bg-ink-100/60",
  danger: "bg-danger text-white hover:bg-red-600 shadow-card",
};

export default function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}) {
  return (
    <button
      disabled={loading || props.disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}
