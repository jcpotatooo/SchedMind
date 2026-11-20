import { CalendarCheck } from "lucide-react";

// SchedMind logo: a rounded teal square with a calendar-check icon + wordmark.
// size: "sm" for headers, "lg" for the login card.
export default function Logo({ size = "sm", showText = true }) {
  const box = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-9 w-9 rounded-xl";
  const icon = size === "lg" ? 32 : 20;
  const text = size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-card`}
      >
        <CalendarCheck size={icon} strokeWidth={2.2} />
      </div>
      {showText && (
        <span className={`${text} font-extrabold tracking-tight text-brand-600`}>
          SchedMind
        </span>
      )}
    </div>
  );
}
