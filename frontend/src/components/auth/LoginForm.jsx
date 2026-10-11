/**
 * Shared login form used by the owner and cashier sign-in screens.
 */

import { useState } from "react";

export default function LoginForm({
  onSubmit,
  loading,
  error,
  title,
  subtitle,
  accentColor = "#0B1E4A",
  submitLabel = "Sign In",
  emailLabel = "Email address",
  identifierType = "email",
  pinLabel = "4-digit PIN",
  allowSetupCredential = false,
  badge,
  securityNote,
}) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(email, pin);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold tracking-[-0.035em] text-slate-900">{title}</h3>
        {badge && (
          <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mb-5 text-sm text-slate-500">{subtitle}</p>}

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </div>
      )}

      <label htmlFor="login-identifier" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {emailLabel}
      </label>
      <input
        id="login-identifier"
        type={identifierType}
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        autoFocus
        className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-[var(--login-accent)]/15"
        style={{ "--login-accent": accentColor }}
        placeholder={identifierType === "email" ? "yourname@store.com" : "Email or employee ID"}
      />

      <label htmlFor="login-pin" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {pinLabel}
      </label>
      <input
        id="login-pin"
        type="password"
        inputMode={allowSetupCredential ? "text" : "numeric"}
        autoComplete="off"
        value={pin}
        onChange={(event) =>
          setPin(allowSetupCredential ? event.target.value : event.target.value.replace(/\D/g, "").slice(0, 4))
        }
        required
        maxLength={allowSetupCredential ? 64 : 4}
        pattern={allowSetupCredential ? undefined : "[0-9]{4}"}
        className={`w-full rounded-lg border border-slate-200 bg-slate-100/80 px-3.5 py-3 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-[var(--login-accent)]/15 ${
          securityNote ? "mb-4" : "mb-5"
        }`}
        style={{ "--login-accent": accentColor }}
        placeholder={allowSetupCredential ? "Enter your PIN or setup code" : "••••"}
      />

      {securityNote && (
        <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-xs leading-5 text-slate-600">
          {securityNote}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg py-3 text-sm font-bold text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        style={{ backgroundColor: accentColor }}
      >
        {loading ? "Signing in…" : submitLabel}
      </button>
    </form>
  );
}
