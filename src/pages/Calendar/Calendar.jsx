import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  isToday, startOfMonth, startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { fmtMin } from "../../lib/plan/format.js";
import { statusInfo } from "../../lib/taskConstants.js";

// CALENDAR (Feature 8): a month view of task deadlines and planned study sessions.
// Everything shown comes from the student's real tasks and schedule.
export default function Calendar() {
  const { tasks, sessions } = usePlan();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const days = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
    }),
    [month]
  );

  // Group items by day (yyyy-MM-dd).
  const byDay = useMemo(() => {
    const map = {};
    const slot = (d) => (map[format(d, "yyyy-MM-dd")] ||= { deadlines: [], sessions: [] });
    tasks.filter((t) => t.deadline).forEach((t) => slot(t.deadline).deadlines.push(t));
    sessions.forEach((s) => slot(new Date(s.start)).sessions.push(s));
    return map;
  }, [tasks, sessions]);

  const info = byDay[format(selected, "yyyy-MM-dd")] || { deadlines: [], sessions: [] };
  const sortedSessions = [...info.sessions].sort((a, b) => a.start - b.start);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Calendar</h1>
      <p className="text-sm text-ink-500">Deadlines and planned study sessions in one place.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-5">
        <section className="rounded-3xl bg-surface p-4 shadow-card lg:col-span-3" aria-label="Month">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}
              className="rounded-lg p-2 hover:bg-page"><ChevronLeft size={18} /></button>
            <div className="flex items-center gap-2">
              <h2 className="font-bold">{format(month, "MMMM yyyy")}</h2>
              <button type="button" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(new Date()); }}
                className="rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">Today</button>
            </div>
            <button type="button" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}
              className="rounded-lg p-2 hover:bg-page"><ChevronRight size={18} /></button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold text-ink-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const data = byDay[format(d, "yyyy-MM-dd")];
              const isSel = isSameDay(d, selected);
              return (
                <button key={d.toISOString()} type="button" onClick={() => setSelected(d)} aria-pressed={isSel}
                  aria-label={format(d, "EEEE, MMMM d")}
                  className={`flex h-14 flex-col items-center justify-start rounded-xl pt-1.5 text-sm transition ${
                    isSel ? "bg-brand-500 text-white" : isToday(d) ? "bg-brand-50 font-bold text-brand-700" : "hover:bg-page"
                  } ${isSameMonth(d, month) ? "" : "opacity-40"}`}>
                  {format(d, "d")}
                  <span className="mt-1 flex gap-1">
                    {data?.deadlines.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? "bg-white" : "bg-danger"}`} />}
                    {data?.sessions.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? "bg-white/70" : "bg-brand-500"}`} />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex gap-4 text-xs text-ink-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> Deadline</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-500" /> Study session</span>
          </p>
        </section>

        <section className="space-y-4 lg:col-span-2" aria-label="Selected day">
          <h2 className="font-bold">{format(selected, "EEEE, MMM d")}</h2>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Deadlines</h3>
            {info.deadlines.length === 0 ? (
              <p className="rounded-2xl bg-surface p-3 text-sm text-ink-500 shadow-card">No deadlines this day.</p>
            ) : (
              <ul className="space-y-2">
                {info.deadlines.map((t) => (
                  <li key={t.id}>
                    <Link to="/tasks" className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-3 text-sm shadow-card hover:shadow-soft">
                      <span className="min-w-0">
                        <span className={`block truncate font-semibold ${t.status === "done" ? "line-through text-ink-500" : ""}`}>{t.title}</span>
                        <span className="text-xs text-ink-500">{statusInfo(t.status).label} · due {format(t.deadline, "h:mm a")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Study sessions</h3>
            {sortedSessions.length === 0 ? (
              <p className="rounded-2xl bg-surface p-3 text-sm text-ink-500 shadow-card">
                No study sessions this day. <Link to="/schedule" className="font-semibold text-brand-600">Open Schedule</Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {sortedSessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-sm shadow-card">
                    <Clock size={16} className="shrink-0 text-brand-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.taskTitle}</span>
                      <span className="text-xs text-ink-500">{format(s.start, "h:mm a")} – {format(s.end, "h:mm a")} · {fmtMin(s.minutes)}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.status === "done" ? "bg-brand-50 text-brand-700" : s.status === "missed" ? "bg-red-50 text-red-700" : "bg-page text-ink-700"
                    }`}>{s.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
