/**
 * Central route definitions with auth guarding. Unauthenticated users
 * are redirected to /login; authenticated users get the main app shell.
 * Role checks use the real backend roles: admin, manager, cashier
 * (there is no "owner" role — admin is the owner-equivalent).
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";

import Login from "../pages/Login";
import OwnerRegister from "../pages/OwnerRegister";
import Dashboard from "../pages/Dashboard";
import Billing from "../pages/Billing";
import Products from "../pages/Products";
import Inventory from "../pages/Inventory";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import AppLayout from "../components/common/AppLayout";

const MANAGER_OR_ADMIN = ["admin", "manager"];

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={role === "cashier" ? "/billing" : "/dashboard"} replace />;
  }

  return children;
}

export default function AppRoutes() {
  const { role } = useAuthContext();
  const homeRoute = role === "cashier" ? "/billing" : "/dashboard";

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<OwnerRegister />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={homeRoute} replace />} />
        <Route path="dashboard" element={<RoleRoute allowedRoles={MANAGER_OR_ADMIN}><Dashboard /></RoleRoute>} />
        <Route path="billing" element={<Billing />} />
        <Route path="products" element={<RoleRoute allowedRoles={MANAGER_OR_ADMIN}><Products /></RoleRoute>} />
        <Route path="inventory" element={<RoleRoute allowedRoles={MANAGER_OR_ADMIN}><Inventory /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute allowedRoles={MANAGER_OR_ADMIN}><Reports /></RoleRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to={homeRoute} replace />} />
    </Routes>
  );
}