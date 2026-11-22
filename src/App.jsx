import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Tasks from "./pages/Tasks/Tasks.jsx";
import Schedule from "./pages/Schedule/Schedule.jsx";
import Rescue from "./pages/Rescue/Rescue.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import Calendar from "./pages/Calendar/Calendar.jsx";
import Habits from "./pages/Habits/Habits.jsx";
import Focus from "./pages/Focus/Focus.jsx";
import Goals from "./pages/Goals/Goals.jsx";
import Progress from "./pages/Progress/Progress.jsx";
import Profile from "./pages/Profile/Profile.jsx";
import Coach from "./pages/Coach/Coach.jsx";
import Admin from "./pages/Admin/Admin.jsx";
import Notifications from "./pages/Notifications/Notifications.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import { ProtectedRoute, PublicRoute } from "./components/auth/ProtectedRoute.jsx";

// Route table.
// - PublicRoute: login/register/forgot password (logged-in users are redirected away).
// - ProtectedRoute: pages that need a signed-in student, shown inside AppLayout
//   (sidebar on desktop, bottom navigation on phones).
// Later phases add more pages (habits, focus, progress, calendar, goals, admin) here.
export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/rescue" element={<Rescue />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Admin only: students are redirected home, and Firestore rules block the data too. */}
      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
