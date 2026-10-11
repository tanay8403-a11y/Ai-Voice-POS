/**
 * Single payment method toggle button (Cash / UPI). Pure presentational
 * — Payment.jsx owns which method is currently selected.
 */

export default function PaymentItem({ id, label, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex-1 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
        active
          ? "border-[#0B1E4A] bg-[#0B1E4A] text-white"
          : "border-slate-200 text-slate-600 hover:border-slate-300"
      }`}
    >
      {label}
    </button>
  );
}