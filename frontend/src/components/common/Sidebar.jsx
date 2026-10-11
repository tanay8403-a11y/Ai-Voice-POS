/**
 * Left navigation sidebar — links shown depend on role (matches the
 * real backend roles: admin, manager, cashier). Highlights the active
 * route.
 */

import { NavLink } from "react-router-dom";
import { LayoutDashboard, Receipt, Package, Boxes, BarChart3, Settings } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { isManagerOrAdmin } from "../../utils/permissions";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresManager: true },
  { to: "/billing", label: "Billing", icon: Receipt, requiresManager: false },
  { to: "/products", label: "Products", icon: Package, requiresManager: true },
  { to: "/inventory", label: "Inventory", icon: Boxes, requiresManager: true },
  { to: "/reports", label: "Reports", icon: BarChart3, requiresManager: true },
  { to: "/settings", label: "Settings", icon: Settings, requiresManager: false },
  { to: "/staff", label: "Staff", icon: User, requiresManager: true },
];

export default function Sidebar() {
  const { user } = useAuthContext();
  const managerAccess = isManagerOrAdmin(user?.role);

  const visibleItems = NAV_ITEMS.filter((item) => !item.requiresManager || managerAccess);

  return (
    <aside className="min-w-[260px] w-64 bg-[#0B1E4A] text-white flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-white/10">
        <p className="font-bold text-lg tracking-tight">Voice AI POS</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}