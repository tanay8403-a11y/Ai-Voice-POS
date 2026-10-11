import {
  Mic,
  MicOff,
  Loader2,
  XCircle,
  PlusCircle,
  Receipt,
} from "lucide-react";

export default function BillingFooter({
  voice,
  cart,
  onMicToggle,
  onCancelBill,
  onNewBilling,
  onCheckout,
}) {
  return (
    <footer className="bg-white border-t border-slate-200 px-6 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* Voice Button */}

        <button
          onClick={onMicToggle}
          disabled={voice.isProcessing}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition ${
            voice.isRecording
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-[#0B1E4A] hover:bg-blue-900 text-white"
          }`}
        >
          {voice.isProcessing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : voice.isRecording ? (
            <Mic size={18} />
          ) : (
            <MicOff size={18} />
          )}

          {voice.isProcessing
            ? "Processing..."
            : voice.isRecording
            ? "Stop Recording"
            : "Start Voice"}
        </button>

        {/* Cart Summary */}

        <div className="hidden lg:flex flex-col items-center">

          <span className="text-xs uppercase tracking-widest text-slate-500">
            Total
          </span>

          <span className="text-2xl font-bold text-slate-800">
            ₹{cart.totals.grand_total?.toFixed(2) || "0.00"}
          </span>

        </div>

        {/* Action Buttons */}

        <div className="flex flex-wrap gap-3">

          <button
            onClick={onCancelBill}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 hover:bg-slate-100 transition"
          >
            <XCircle size={18} />
            Cancel
          </button>

          <button
            onClick={onNewBilling}
            className="flex items-center gap-2 rounded-xl bg-indigo-100 text-indigo-700 px-5 py-3 hover:bg-indigo-200 transition"
          >
            <PlusCircle size={18} />
            New Bill
          </button>

          <button
            onClick={onCheckout}
            disabled={cart.isEmpty}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 font-semibold transition"
          >
            <Receipt size={18} />
            Checkout
          </button>

        </div>

      </div>

    </footer>
  );
}