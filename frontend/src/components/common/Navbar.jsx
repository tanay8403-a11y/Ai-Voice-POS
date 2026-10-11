/**
 * Shared top navigation styled to the supplied Voice AI POS mockups.
 * Links point to routes already used by this project; no fake terminal,
 * customer, notification, or schedule data is displayed.
 */

import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Command,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { isAdmin, isCashier, isManagerOrAdmin } from "../../utils/permissions";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, managerOnly: true },
  { to: "/cashier-dashboard", label: "My Shift", icon: Gauge, cashierOnly: true },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Boxes, managerOnly: true },
  { to: "/staff", label: "Staff", icon: Users, adminOnly: true },
  { to: "/reports", label: "Reports", icon: BarChart3, managerOnly: true },
];

export default function Navbar() {
  const { user, logout } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const managerAccess = isManagerOrAdmin(user?.role);
  const cashierAccess = isCashier(user?.role);
  const adminAccess = isAdmin(user?.role);
  const items = NAV_ITEMS.filter((item) =>
    (!item.managerOnly || managerAccess) && (!item.cashierOnly || cashierAccess)
  );
  const visibleItems = items.filter((item) => !item.adminOnly || adminAccess);
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const navClass = ({ isActive }) =>
    `app-nav-link inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide transition ${
      isActive
        ? "app-nav-active"
        : "app-nav-inactive"
    }`;

  return (
    <header className="app-topbar sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="app-topbar-inner mx-auto flex min-h-16 max-w-[1800px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-7">
        <Link to={managerAccess ? "/dashboard" : "/cashier-dashboard"} className="app-topbar-brand inline-flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-[#1e3a8a] sm:text-xl">
          <span className="app-topbar-brand-mark"><Command size={18} /></span>
          <span>Voice AI POS</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass}>
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {managerAccess && (
            <Link to="/settings" aria-label="Settings" title="Settings" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#1e3a8a]">
              <Settings size={19} />
            </Link>
          )}
          <div className="hidden h-7 w-px bg-slate-200 sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-32 truncate text-sm font-semibold text-slate-700">{displayName}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00236f] text-xs font-bold text-white" aria-hidden="true">{initials || "U"}</span>
          </div>
          <button type="button" onClick={logout} title="Log out" aria-label="Log out" className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 sm:inline-flex">
            <LogOut size={18} />
          </button>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 xl:hidden">
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      <nav aria-label="Main navigation mobile" className="border-t border-slate-100 px-3 py-2 xl:!hidden" style={{ display: mobileOpen ? "block" : "none" }}>
        {/* NavLink list stays mounted for consistent active-state styling. */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navClass} onClick={() => setMobileOpen(false)}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          {managerAccess && <NavLink to="/settings" className={navClass} onClick={() => setMobileOpen(false)}><Settings size={16} /> Settings</NavLink>}
          <button type="button" onClick={logout} className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-rose-700 hover:bg-rose-50"><LogOut size={16} /> Log out</button>
        </div>
      </nav>
    </header>
  );
}
