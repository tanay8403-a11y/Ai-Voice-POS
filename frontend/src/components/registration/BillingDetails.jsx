/**
 * Billing and taxation settings mapped to Store model columns.
 */

import { Landmark } from "lucide-react";

const CURRENCIES = ["INR", "USD", "EUR"];
const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "UTC"];

export default function BillingDetails({ data, errors, updateField }) {
  return (
    <div className="space-y-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Landmark size={20} className="text-[#1e3a8a]" />
        <h2 className="text-lg font-semibold text-slate-800">Billing &amp; Taxation Setup</h2>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tax Registration</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="GST Number (optional)" error={errors.gst_number}>
            <input
              value={data.gst_number}
              onChange={(e) => updateField("gst_number", e.target.value.toUpperCase())}
              placeholder="27ABCDE1234F1Z5"
              maxLength={15}
              className={inputClass(errors.gst_number)}
            />
          </Field>
          <Field label="PAN Number (optional)" error={errors.pan_number}>
            <input
              value={data.pan_number}
              onChange={(e) => updateField("pan_number", e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              maxLength={10}
              className={inputClass(errors.pan_number)}
            />
          </Field>
          <Field label="Default Tax %">
            <input
              type="number"
              min="0"
              max="100"
              value={data.default_tax}
              onChange={(e) => updateField("default_tax", parseInt(e.target.value) || 0)}
              className={inputClass()}
            />
          </Field>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Payment Details (optional)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="UPI ID" error={errors.upi_id}>
            <input
              value={data.upi_id}
              onChange={(e) => updateField("upi_id", e.target.value)}
              placeholder="yourstore@okaxis"
              className={inputClass(errors.upi_id)}
            />
          </Field>
          <Field label="Bank Name" error={errors.bank_name}>
            <input
              value={data.bank_name}
              onChange={(e) => updateField("bank_name", e.target.value)}
              placeholder="State Bank of India"
              className={inputClass(errors.bank_name)}
            />
          </Field>

          <Field label="Account Holder Name" error={errors.account_holder}>
            <input
              value={data.account_holder}
              onChange={(e) => updateField("account_holder", e.target.value)}
              placeholder="As per bank records"
              className={inputClass(errors.account_holder)}
            />
          </Field>

          <Field label="Account Number" error={errors.account_number}>
            <input
              value={data.account_number}
              onChange={(e) => updateField("account_number", e.target.value.replace(/\D/g, ""))}
              placeholder="1234567890123"
              className={inputClass(errors.account_number)}
            />
          </Field>

          <Field label="IFSC Code" error={errors.ifsc_code}>
            <input
              value={data.ifsc_code}
              onChange={(e) => updateField("ifsc_code", e.target.value.toUpperCase())}
              placeholder="SBIN0001234"
              maxLength={11}
              className={inputClass(errors.ifsc_code)}
            />
          </Field>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Invoice Defaults</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Currency">
            <select value={data.currency} onChange={(e) => updateField("currency", e.target.value)} className={inputClass()}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Timezone">
            <select value={data.timezone} onChange={(e) => updateField("timezone", e.target.value)} className={inputClass()}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(error) {
  return `w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 ${
    error ? "ring-2 ring-rose-300" : "focus:ring-[#0B1E4A]/30"
  }`;
}