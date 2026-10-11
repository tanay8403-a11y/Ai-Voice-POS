/**
 * Step 1: owner account details — name, email, phone, and PIN.
 * Reads/writes through useRegistration's data/errors/updateField.
 */

export default function OwnerDetails({ data, errors, updateField }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Owner Details</h2>
      <p className="text-sm text-slate-500 mb-6">Let's start with your personal account.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" error={errors.name}>
          <input
            value={data.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="Tanay Sharma"
            className={inputClass(errors.name)}
          />
        </Field>

        <Field label="Phone Number" error={errors.phone}>
          <input
            value={data.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="9876543210"
            className={inputClass(errors.phone)}
          />
        </Field>

        <Field label="Email Address" error={errors.email} className="sm:col-span-2">
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="owner@yourstore.com"
            className={inputClass(errors.email)}
          />
        </Field>

        <Field label="4-digit PIN" error={errors.pin}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            pattern="[0-9]{4}"
            value={data.pin}
            onChange={(e) => updateField("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Choose 4 digits"
            className={inputClass(errors.pin)}
          />
        </Field>

        <Field label="Confirm PIN" error={errors.confirmPin}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            pattern="[0-9]{4}"
            value={data.confirmPin}
            onChange={(e) => updateField("confirmPin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter PIN again"
            className={inputClass(errors.confirmPin)}
          />
        </Field>
      </div>
    </div>
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