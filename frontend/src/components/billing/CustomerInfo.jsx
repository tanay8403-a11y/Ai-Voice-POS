/**
 * Customer name/phone capture for the current sale. Purely local form
 * state for now — wiring to a real Customer record (via customer_id on
 * the cart) happens when the sale is checked out, not on every keystroke.
 */

import { useState } from "react";
import { UserPlus } from "lucide-react";

export default function CustomerInfo({ onCustomerChange }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleNameChange = (value) => {
    setName(value);
    onCustomerChange?.({ name: value, phone });
  };

  const handlePhoneChange = (value) => {
    setPhone(value);
    onCustomerChange?.({ name, phone: value });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Customer Information</span>
        <button className="text-[#0B1E4A]" aria-label="Add customer">
          <UserPlus size={18} />
        </button>
      </div>

      <label className="block text-xs text-slate-500 mb-1">Name</label>
      <input
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        placeholder="Walk-in Customer"
        className="w-full text-sm font-semibold text-slate-800 border-0 border-b border-slate-200 pb-2 mb-3 focus:outline-none focus:border-[#0B1E4A] bg-transparent placeholder:font-normal placeholder:text-slate-400"
      />

      <label className="block text-xs text-slate-500 mb-1">Phone</label>
      <input
        value={phone}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder="Enter phone number..."
        className="w-full text-sm bg-slate-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
      />
    </div>
  );
}