// Friendly "nothing here yet" box. `action` is an optional button/element.
export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center shadow-card">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon size={26} />
        </div>
      )}
      <h3 className="text-base font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
