/**
 * Step 2: business/store details — matches the Store model's required
 * fields (store_name, store_phone, store_email, address, city, state,
 * pincode) plus optional GST/PAN. Includes the logo uploader.
 */

import { MapPin, Store } from "lucide-react";
import ImageUploader from "./ImageUpload";

const BUSINESS_TYPES = ["Retail", "Restaurant", "Pharmacy", "Grocery", "Electronics", "Clothing", "Other"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Delhi", "Gujarat", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "West Bengal", "Other",
];

export default function BusinessDetails({ data, errors, updateField, logoPreview, onLogoSelect, onLogoRemove }) {
  return (
    <>
      <section className="space-y-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Store size={20} className="text-[#1e3a8a]" />
          <h2 className="text-lg font-semibold text-slate-800">Store Profile &amp; Contact</h2>
        </div>
        <ImageUploader
          preview={logoPreview}
          onFileSelect={onLogoSelect}
          onRemove={onLogoRemove}
          error={errors.logo}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Store Name" error={errors.store_name}>
          <input
            value={data.store_name}
            onChange={(e) => updateField("store_name", e.target.value)}
            placeholder="Sharma General Store"
            className={inputClass(errors.store_name)}
          />
        </Field>

        <Field label="Business Type" error={errors.business_type}>
          <select
            value={data.business_type}
            onChange={(e) => updateField("business_type", e.target.value)}
            className={inputClass(errors.business_type)}
          >
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Store Phone" error={errors.store_phone}>
          <input
            value={data.store_phone}
            onChange={(e) => updateField("store_phone", e.target.value)}
            placeholder="9876543210"
            className={inputClass(errors.store_phone)}
          />
        </Field>

        <Field label="Store Email" error={errors.store_email}>
          <input
            type="email"
            value={data.store_email}
            onChange={(e) => updateField("store_email", e.target.value)}
            placeholder="store@yourstore.com"
            className={inputClass(errors.store_email)}
          />
        </Field>
        </div>
      </section>

      <section id="store-location" className="space-y-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-[#1e3a8a]" />
          <h2 className="text-lg font-semibold text-slate-800">Store Address &amp; Location</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Street Address & Landmark" error={errors.address} className="sm:col-span-2">
          <input
            value={data.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Shop No. 12, Main Market Road"
            className={inputClass(errors.address)}
          />
          </Field>

        <Field label="City" error={errors.city}>
          <input
            value={data.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Pune"
            className={inputClass(errors.city)}
          />
        </Field>

        <Field label="State" error={errors.state}>
          <select
            value={data.state}
            onChange={(e) => updateField("state", e.target.value)}
            className={inputClass(errors.state)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Pincode" error={errors.pincode}>
          <input
            value={data.pincode}
            onChange={(e) => updateField("pincode", e.target.value)}
            placeholder="411001"
            maxLength={6}
            className={inputClass(errors.pincode)}
          />
        </Field>

        <Field label="Country">
          <input value={data.country} readOnly className="w-full text-sm bg-slate-50 rounded-lg px-3 py-2.5 text-slate-400" />
        </Field>

        </div>
      </section>
    </>
  );
}

function Field({ label, error, children, className = "" }) {
  return (
    <div className={className}>
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