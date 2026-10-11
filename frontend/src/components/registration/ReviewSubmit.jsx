/**
 * Step 4: final review before submission — shows every field the person
 * actually entered (skips empty optional fields rather than showing
 * blank rows), plus the logo preview and any server-side submit error.
 */

export default function ReviewSubmit({ data, logoPreview, submitError }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Review & Submit</h2>
      <p className="text-sm text-slate-500 mb-6">Double-check everything before creating your store.</p>

      {submitError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg px-4 py-2.5 mb-4">
          {submitError}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        {logoPreview ? (
          <img src={logoPreview} alt="Store logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 text-xs">No logo</div>
        )}
        <div>
          <p className="text-lg font-bold text-slate-800">{data.store_name || "—"}</p>
          <p className="text-sm text-slate-500">{data.business_type}</p>
        </div>
      </div>

      <Section title="Owner">
        <Row label="Name" value={data.name} />
        <Row label="Email" value={data.email} />
        <Row label="Phone" value={data.phone} />
      </Section>

      <Section title="Business">
        <Row label="Store Phone" value={data.store_phone} />
        <Row label="Store Email" value={data.store_email} />
        <Row label="Address" value={`${data.address}, ${data.city}, ${data.state} ${data.pincode}`} />
        <Row label="GST Number" value={data.gst_number} />
        <Row label="PAN Number" value={data.pan_number} />
      </Section>

      <Section title="Billing">
        <Row label="UPI ID" value={data.upi_id} />
        <Row label="Bank Name" value={data.bank_name} />
        <Row label="Account Holder" value={data.account_holder} />
        <Row label="Account Number" value={data.account_number ? `••••${data.account_number.slice(-4)}` : ""} />
        <Row label="IFSC Code" value={data.ifsc_code} />
        <Row label="Default Tax" value={`${data.default_tax}%`} />
        <Row label="Currency" value={data.currency} />
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-slate-50 rounded-lg divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between px-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}