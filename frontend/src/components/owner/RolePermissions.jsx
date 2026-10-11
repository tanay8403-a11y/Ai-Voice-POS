/**
 * Read-only reference showing what each role can do — mirrors
 * utils/permissions.js's PERMISSIONS map so the owner can see the
 * actual enforced rules, not a separate/inconsistent description.
 */

import { PERMISSIONS, ROLE_RANK_LABELS } from "../../utils/permissions";

const PERMISSION_LABELS = {
  VIEW_REPORTS: "View Reports & Analytics",
  MANAGE_PRODUCTS: "Manage Products",
  MANAGE_STAFF: "Manage Staff Accounts",
  ADJUST_INVENTORY: "Adjust Inventory",
  REFUND_PAYMENT: "Refund Payments",
  CANCEL_INVOICE: "Cancel Invoices",
  PROCESS_SALE: "Process Sales (Billing)",
  VIEW_VOICE_ANALYTICS: "View Voice Analytics",
};

export default function RolePermissions() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Role Permissions</h3>

      <table className="w-full">
        <thead>
          <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
            <th className="text-left py-2 pr-2">Permission</th>
            <th className="text-center py-2">Minimum Role Required</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(PERMISSIONS).map(([key, role]) => (
            <tr key={key} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-2 text-sm text-slate-700">{PERMISSION_LABELS[key] || key}</td>
              <td className="py-2.5 text-center">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">
                  {role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}