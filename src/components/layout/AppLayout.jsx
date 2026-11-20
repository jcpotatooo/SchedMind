import { NavLink, Outlet } from "react-router-dom";
import { House, ListChecks } from "lucide-react";
import Logo from "./Logo.jsx";
import LogoutButton from "../auth/LogoutButton.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

// Add new pages here as they are built (Habits, Focus, Progress... in Phase 4).
// We only list pages that really exist, so no navigation item is a dead link.
const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
];

// Shell for every logged-in page:
// phones  -> top bar + bottom navigation (like the prototype)
// desktop -> fixed left sidebar
export default function AppLayout() {
  const { displayName } = useAuth();

  return (
    <div className="min-h-screen bg-page md:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ink-100 bg-surface p-5 md:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-page"
                }`
              }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-100 pt-4">
          <p className="truncate px-3 text-sm font-semibold">{displayName}</p>
          <LogoutButton className="mt-1 w-full" />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="flex items-center justify-between px-4 pt-4 md:hidden">
        <Logo />
        <LogoutButton />
      </header>

      <main className="pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Phone bottom navigation */}
      <nav aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-100 bg-surface md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium ${
                isActive ? "text-brand-600" : "text-ink-500"
              }`
            }>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
