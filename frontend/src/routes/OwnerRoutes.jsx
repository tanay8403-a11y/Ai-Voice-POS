import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";

export default function OwnerLayout() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  const showNavbar = user?.role !== "cashier";

  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/billing", label: "Billing" },
    { to: "/products", label: "Products", permission: "products.view" },
    { to: "/inventory", label: "Inventory", permission: "inventory.view" },
    { to: "/reports", label: "Reports", permission: "reports.view" },
    { to: "/staff", label: "Staff", permission: "staff.manage" },
    { to: "/settings", label: "Settings" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {showNavbar && (
        <header className="flex items-center justify-between bg-[#0B1E4A] px-6 py-3 text-white">
          <div className="font-bold text-lg">Voice AI POS</div>

          <nav className="flex gap-2">
            {navItems
              .filter((item) => !item.permission || hasPermission(user, item.permission))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-1 rounded ${isActive ? "bg-white/20 text-white" : "text-slate-300 hover:text-white"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="flex items-center gap-3">
            <span>{user?.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}