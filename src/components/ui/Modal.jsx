import { useEffect } from "react";
import { X } from "lucide-react";

// Popup dialog. Bottom sheet on phones, centered card on larger screens.
// Closes with the X button, the Escape key, or by clicking the dark background.
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling while the dialog is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-soft sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-ink-500 transition hover:bg-ink-100/60"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}
