/**
 * Single cart row: quantity input, per-item discount input, computed
 * line total (price - discount + tax), and remove button. Purely
 * presentational — Cart.jsx owns state via props/callbacks.
 */

import { X } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

export default function CartItem({ item, onUpdateQuantity, onRemove, onApplyDiscount }) {
  const gross = item.unit_price * item.quantity;
  const afterDiscount = gross - (item.discount || 0);
  const tax = afterDiscount * ((item.tax_percent || 0) / 100);
  const lineTotal = afterDiscount + tax;

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-2">
        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
      </td>
      <td className="py-3 pr-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
          className="w-16 text-sm bg-slate-100 rounded-md px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
        />
      </td>
      <td className="py-3 pr-2 text-sm text-slate-600 text-right whitespace-nowrap">
        {formatCurrency(item.unit_price)}
      </td>
      <td className="py-3 pr-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.discount || 0}
          onChange={(e) => onApplyDiscount(item.product_id, parseFloat(e.target.value) || 0)}
          className="w-16 text-sm bg-slate-100 rounded-md px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
        />
      </td>
      <td className="py-3 pr-2 text-sm font-semibold text-slate-800 text-right whitespace-nowrap">
        {formatCurrency(lineTotal)}
      </td>
      <td className="py-3 pl-2 text-right">
        <button
          onClick={() => onRemove(item.product_id)}
          className="w-6 h-6 inline-flex items-center justify-center rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          aria-label="Remove item"
        >
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}