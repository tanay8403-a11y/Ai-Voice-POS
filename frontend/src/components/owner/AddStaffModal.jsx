/**
 * Add-staff form: name/email/phone/role. On success shows the generated
 * employee ID + one-time setup PIN as a fallback (in case the email didn't
 * send), since that's the only time the API ever returns the plaintext PIN.
 */

import { useState } from "react";
import Modal from "../common/Modal";
import { createStaff } from "../../services/auth";
import { useNotify } from "../common/Notification";

const ROLES = [
  { value: "cashier", label: "Cashier" },
  { value: "manager", label: "Manager" },
];

function getRequestErrorMessage(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item.msg || "Invalid staff details")
      .join(". ");
  }
  return error.response
    ? "Staff account could not be created. Please check the details and try again."
    : "Could not reach the server. Check your connection and try again.";
}

export default function AddStaffModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "cashier" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // holds { employee_id, one_time_pin, email_sent } after success
  const notify = useNotify();

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { name, email, phone, role } = form;
      const data = await createStaff({ name, email, phone }, role);
      setResult(data);
      notify(data.email_sent ? "Staff created — setup PIN emailed." : "Staff created — email failed, see the setup PIN below.", data.email_sent ? "success" : "warning");
      onCreated?.();
    } catch (err) {
      notify(getRequestErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({ name: "", email: "", phone: "", role: "cashier" });
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={result ? "Staff Created" : "Add Staff"}>
      {result ? (
        <div>
          <p className="text-sm text-slate-600 mb-3">
            Share this one-time setup PIN with <strong>{form.name}</strong> if the email didn't arrive:
          </p>
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm mb-4">
            <div className="flex justify-between"><span className="text-slate-500">Employee ID</span><span className="font-mono font-semibold">{result.employee_id}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">One-time PIN</span><span className="font-mono font-semibold">{result.one_time_pin}</span></div>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            It can be used once to set their personal 4-digit PIN.
          </p>
          <button
            onClick={handleClose}
            className="w-full bg-[#0B1E4A] text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-[#132a63] transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Name</label>
          <input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
            className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
          />

          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
          />

          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            required
            className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
          />

          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0B1E4A] text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#132a63] transition-colors"
          >
            {submitting ? "Creating…" : "Create Staff Account"}
          </button>
        </form>
      )}
    </Modal>
  );
}