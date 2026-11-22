import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { AlarmClock, Bell, CheckCheck, Lightbulb, TriangleAlert, CalendarDays, CircleX } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { markAllRead, markRead } from "../../services/notificationService.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

const ICONS = { overdue: TriangleAlert, deadline: AlarmClock, recommendation: Lightbulb, session: CalendarDays, missed: CircleX };
const COLORS = {
  overdue: "bg-red-50 text-red-700", deadline: "bg-amber-50 text-amber-700", recommendation: "bg-accent-purple/10 text-accent-purple",
  session: "bg-brand-50 text-brand-700", missed: "bg-red-50 text-red-700",
};

// SMART REMINDERS inbox (Feature 9). Notifications are created automatically by PlanContext.
export default function Notifications() {
  const { notifications, notificationsLoading, unreadCount } = usePlan();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = [...notifications].sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

  async function readOne(n) {
    if (n.read) return;
    try { await markRead(n.id); } catch (err) { setError(friendlyError(err)); }
  }
  async function readAll() {
    setBusy(true);
    try { await markAllRead(notifications.filter((n) => !n.read).map((n) => n.id)); }
    catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-ink-500">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <div className="w-44"><Button variant="outline" onClick={readAll} loading={busy}><CheckCheck size={16} /> Mark all read</Button></div>
        )}
      </div>
      <div className="mt-4"><Alert type="error">{error}</Alert></div>

      <div className="mt-5">
        {notificationsLoading ? <Spinner label="Loading notifications..." /> : sorted.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications yet"
            text="SchedMind reminds you about deadlines, overdue tasks, upcoming or missed study sessions and tasks at risk." />
        ) : (
          <ul className="space-y-2">
            {sorted.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n.id}>
                  <Link to={n.link || "/"} onClick={() => readOne(n)}
                    className={`flex items-start gap-3 rounded-2xl p-4 shadow-card transition hover:shadow-soft ${n.read ? "bg-surface" : "bg-brand-50/60"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${COLORS[n.type] || "bg-page"}`}><Icon size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {n.title}{!n.read && <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Unread" />}
                      </span>
                      <span className="block text-sm text-ink-700">{n.message}</span>
                      {n.createdAt && <span className="text-xs text-ink-500">{formatDistanceToNow(n.createdAt, { addSuffix: true })}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
