// Labeled input with a left icon and an optional error message under it.
export default function Input({ label, icon: Icon, error, id, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-center text-sm font-semibold">
        {label}
      </label>
      <div
        className={`flex h-12 items-center gap-3 rounded-2xl border bg-page px-4 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 ${
          error ? "border-danger" : "border-ink-100"
        }`}
      >
        {Icon && <Icon size={18} className="text-ink-500" />}
        <input
          id={id}
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-500"
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}
