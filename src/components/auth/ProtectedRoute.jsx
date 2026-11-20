import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

// Wrap pages that need a logged-in student:
//   <Route element={<ProtectedRoute />}> ...pages... </Route>
// Pass requireAdmin for admin-only pages (used in Phase 5).
export function ProtectedRoute({ requireAdmin = false }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) {
    // Remember where they wanted to go, so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Wrap login/register/forgot-password: logged-in users are sent away from them.
export function PublicRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    const target = location.state?.from?.pathname || "/";
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}
