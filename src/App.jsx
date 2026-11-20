import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Tasks from "./pages/Tasks/Tasks.jsx";
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
