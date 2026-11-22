import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell, CalendarDays, UserRound, ShieldCheck, Ellipsis, Flag, House, ListChecks, Settings, Target, Timer, TrendingUp, X,
} from "lucide-react";
import Logo from "./Logo.jsx";
import LogoutButton from "../auth/LogoutButton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { PlanProvider, usePlan } from "../../context/PlanContext.jsx";
import { FocusProvider, useFocus } from "../../context/FocusContext.jsx";

// Only pages that really exist are listed, so no navigation item is a dead link.
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/habits", label: "Habits", icon: Target },
  { to: "/focus", label: "Focus", icon: Timer },
  { to: "/goals", label: "Goals", icon: Flag },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
];
const ADMIN_ITEM = { to: "/admin", label: "Admin", icon: ShieldCheck };
const PHONE_MAIN = ["/", "/tasks", "/habits", "/focus", "/progress"];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-page"
  }`;

function BellLink() {
  const { unreadCount } = usePlan();
  return (
    <Link to="/notifications" aria-label={`Notifications, ${unreadCount} unread`}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 hover:bg-page">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

// Shows the running timer on every page so it is never forgotten.
function TimerPill() {
  const { timer, remainingMs } = useFocus();
  const { pathname } = useLocation();
  if (timer.status === "idle" || pathname === "/focus") return null;
  const total = Math.ceil(remainingMs / 1000);
  const text = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  return (
    <Link to="/focus" className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft md:bottom-6">
      <Timer size={16} /> {text}{timer.status === "paused" ? " (paused)" : ""}
    </Link>
  );
}

function Shell() {
  const { displayName, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  const phoneMain = NAV_ITEMS.filter((n) => PHONE_MAIN.includes(n.to));
  const phoneMore = navItems.filter((n) => !PHONE_MAIN.includes(n.to));

  return (
    <div className="min-h-screen bg-page md:pl-60">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r border-ink-100 bg-surface p-5 md:flex">
        <div className="flex items-center justify-between"><Logo /><BellLink /></div>
        <nav className="mt-6 flex flex-col gap-1" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}><Icon size={18} /> {label}</NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-100 pt-4">
          <p className="truncate px-3 text-sm font-semibold">{displayName}</p>
          <LogoutButton className="mt-1 w-full" />
        </div>
      </aside>

      <header className="flex items-center justify-between px-4 pt-4 md:hidden">
        <Logo />
        <div className="flex items-center gap-1"><BellLink /><LogoutButton /></div>
      </header>

      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8"><Outlet /></main>
      <TimerPill />

      {more && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] rounded-t-3xl bg-surface p-4 pb-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">More</p>
              <button type="button" aria-label="Close menu" onClick={() => setMore(false)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {phoneMore.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass}><Icon size={18} /> {label}</NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        {phoneMain.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${isActive ? "text-brand-600" : "text-ink-500"}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}
          className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${more ? "text-brand-600" : "text-ink-500"}`}>
          <Ellipsis size={20} /> More
        </button>
      </nav>
    </div>
  );
}

export default function AppLayout() {
  return (
    <PlanProvider>
      <FocusProvider>
        <Shell />
      </FocusProvider>
    </PlanProvider>
  );
}
