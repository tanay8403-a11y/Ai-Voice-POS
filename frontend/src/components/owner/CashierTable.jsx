/**
 * Staff management table — lists all accounts, lets the owner toggle
 * active status and change roles. Backed by the new /auth/staff endpoints.
 */

import { useEffect, useState } from "react";
import { listStaff, updateStaffRole, updateStaffStatus } from "../../services/auth";
import { useNotify } from "../common/Notification";
import { formatDate } from "../../utils/formatter";

const ROLE_OPTIONS = ["manager", "cashier"];

export default function CashierTable() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  const load = async () => {
    setLoading(true);
    try {
      const data = await listStaff();
      setStaff(data);
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to load staff list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoleChange = async (userId, role) => {
    try {
      await updateStaffRole(userId, role);
      notify("Role updated.", "success");
      load();
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to update role.", "error");
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await updateStaffStatus(userId, !currentStatus);
      notify(currentStatus ? "Staff deactivated." : "Staff activated.", "success");
      load();
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to update status.", "error");
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400 py-8 text-center">Loading staff…</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Staff</h3>

      {staff.length === 0 ? (
        <p className="text-sm text-slate-400">No staff accounts yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
              <th className="text-left py-2 pr-2">Name</th>
              <th className="text-left py-2 pr-2">Email</th>
              <th className="text-left py-2 pr-2">Role</th>
              <th className="text-left py-2 pr-2">Joined</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-2 text-sm font-medium text-slate-800">{s.name}</td>
                <td className="py-2.5 pr-2 text-sm text-slate-500">{s.email}</td>
                <td className="py-2.5 pr-2">
                  <select
                    value={s.role}
                    onChange={(e) => handleRoleChange(s.id, e.target.value)}
                    className="text-sm bg-slate-100 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
                  >
                    {s.role === "admin" && <option value="admin">admin</option>}
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 pr-2 text-sm text-slate-500">{formatDate(s.created_at)}</td>
                <td className="py-2.5">
                  <button
                    onClick={() => handleToggleStatus(s.id, s.is_active)}
                    className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                      s.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}