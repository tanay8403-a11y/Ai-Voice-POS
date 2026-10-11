/**
 * Subtotal / tax / discount / grand total breakdown. Reads totals
 * straight from useCart, which itself reflects the live server-side
 * invoice — nothing here is computed client-side.
 */

import { useCart } from "../../hooks/useCart";
import { formatCurrency } from "../../utils/currency";

export default function BillSummary() {
  const { totals } = useCart();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="text-lg font-bold text-slate-800 mb-3">Bill Summary</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Tax</span>
          <span>{formatCurrency(totals.tax)}</span>
        </div>
        <div className="flex justify-between text-rose-500">
          <span>Discount</span>
          <span>-{formatCurrency(totals.discount)}</span>
        </div>
      </div>

      <div className="border-t border-slate-200 mt-3 pt-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Grand Total</p>
        <p className="text-3xl font-bold text-[#0B1E4A]">{formatCurrency(totals.total)}</p>
      </div>
    </div>
  );
}