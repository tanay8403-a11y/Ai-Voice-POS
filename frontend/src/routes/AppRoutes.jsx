import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login";
import OwnerRegister from "../pages/OwnerRegister";
import AppLayout from "../components/common/AppLayout";
import { useAuthContext } from "../context/AuthContext";
import Billing from "../pages/Billing";
import CashierDashboard from "../pages/CashierDashboard";
import Dashboard from "../pages/Dashboard";
import InventoryManagement from "../pages/InventoryManagement";
import Products from "../pages/Products";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Staff from "../pages/staff";
import { isAdmin, isCashier, isManagerOrAdmin } from "../utils/permissions";

function LandingRedirect() {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isCashier(user?.role) ? "/cashier-dashboard" : "/dashboard"} replace />;
}

function ManagerOnly({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isManagerOrAdmin(user?.role)) return <Navigate to="/cashier-dashboard" replace />;
  return children;
}

function CashierOnly({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/cashier-login" replace />;
  if (!isCashier(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function BillingAccess({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCashier(user?.role) && !isManagerOrAdmin(user?.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function ProductsAccess({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isCashier(user?.role) && !isManagerOrAdmin(user?.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminOnly({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, isAuthenticated } = useAuthContext();
  if (!isAuthenticated) return children;
  return <Navigate to={isCashier(user?.role) ? "/cashier-dashboard" : "/dashboard"} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/owner-login" element={<GuestOnly><Login initialMode="owner" /></GuestOnly>} />
      <Route path="/cashier-login" element={<GuestOnly><Login initialMode="cashier" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><OwnerRegister /></GuestOnly>} />
      <Route path="/" element={<LandingRedirect />} />
      <Route element={<AppLayout />}>
        <Route path="/cashier-dashboard" element={<CashierOnly><CashierDashboard /></CashierOnly>} />
        <Route path="/billing" element={<BillingAccess><Billing /></BillingAccess>} />
        <Route path="/dashboard" element={<ManagerOnly><Dashboard /></ManagerOnly>} />
        <Route path="/inventory" element={<ManagerOnly><InventoryManagement /></ManagerOnly>} />
        <Route path="/products" element={<ProductsAccess><Products /></ProductsAccess>} />
        <Route path="/reports" element={<ManagerOnly><Reports /></ManagerOnly>} />
        <Route path="/settings" element={<ManagerOnly><Settings /></ManagerOnly>} />
        <Route path="/staff" element={<AdminOnly><Staff /></AdminOnly>} />
      </Route>
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  );
}
