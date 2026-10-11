/**
 * Visual password strength meter, driven by the real scoring logic in
 * utils/validation.js's getPasswordStrength — not a cosmetic-only bar.
 */

import { getPasswordStrength } from "../../utils/validation";

const BAR_COLORS = ["bg-rose-400", "bg-rose-400", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
const TEXT_COLORS = ["text-rose-500", "text-rose-500", "text-amber-500", "text-emerald-600", "text-emerald-600"];

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score - 1 ? BAR_COLORS[score] : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs mt-1 font-medium ${TEXT_COLORS[score]}`}>{label}</p>
    </div>
  );
}