// Left-aligned label + error wrapper for the task form (the auth <Input> centers its label).
export function controlClass(invalid = false) {
  return `h-11 w-full rounded-xl border bg-page px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${
    invalid ? "border-danger" : "border-ink-100"
  }`;
}

export default function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
