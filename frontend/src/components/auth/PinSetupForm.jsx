import { useState } from "react";

export default function PinSetupForm({ onSubmit, onCancel, loading, error }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setValidationError("Your new PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setValidationError("The PINs do not match.");
      return;
    }
    setValidationError("");
    onSubmit(pin);
  };

  const updatePin = (setter) => (event) => {
    setter(event.target.value.replace(/\D/g, "").slice(0, 4));
    setValidationError("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <h3 className="text-xl font-bold tracking-[-0.035em] text-slate-900">Set your personal PIN</h3>
      <p className="mb-5 mt-1 text-sm leading-5 text-slate-500">
        Your setup code is one-time. Choose a new 4-digit PIN to finish signing in.
      </p>

      {(validationError || error) && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {validationError || error}
        </div>
      )}

      <label htmlFor="new-pin" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        New 4-digit PIN
      </label>
      <input
        id="new-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={updatePin(setPin)}
        required
        maxLength={4}
        pattern="[0-9]{4}"
        autoFocus
        className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-emerald-700/15"
        placeholder="••••"
      />

      <label htmlFor="confirm-new-pin" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Confirm PIN
      </label>
      <input
        id="confirm-new-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={confirmPin}
        onChange={updatePin(setConfirmPin)}
        required
        maxLength={4}
        pattern="[0-9]{4}"
        className="mb-5 w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-emerald-700/15"
        placeholder="••••"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Setting PIN…" : "Save PIN and continue"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
      >
        Back to sign in
      </button>
    </form>
  );
}
