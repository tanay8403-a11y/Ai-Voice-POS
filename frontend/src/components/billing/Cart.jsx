/**
 * Cart display component: shows current line items, quantity controls,
 * per-item discount, and running totals. Purely presentational — all
 * state comes from the useCart hook via props, same contract as before,
 * just split into CartItem rows and restyled with Tailwind.
 */

import { ShoppingCart } from "lucide-react";
import CartItem from "./CartItem";
import { formatCurrency } from "../../utils/currency";

export default function Cart({ items, totals, onUpdateQuantity, onRemoveItem, onApplyDiscount, onCheckout, isEmpty }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col h-full">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Cart</h3>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 py-16">
          <ShoppingCart size={40} strokeWidth={1.5} />
          <p className="text-sm text-slate-400 text-center">No items in cart yet.<br />Scan, search, or use voice to add items.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
                  <th className="text-left py-2 pr-2">Item</th>
                  <th className="text-left py-2 pr-2">Qty</th>
                  <th className="text-right py-2 pr-2">Price</th>
                  <th className="text-left py-2 pr-2">Discount</th>
                  <th className="text-right py-2 pr-2">Line Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <CartItem
                    key={item.product_id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                    onApplyDiscount={onApplyDiscount}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-rose-500">
              <span>Discount:</span><span>-{formatCurrency(totals.discount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax:</span><span>+{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-[#0B1E4A] pt-1.5 border-t border-slate-100">
              <span>Total:</span><span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            disabled={isEmpty}
            className="w-full mt-4 bg-[#0B1E4A] text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-40 hover:bg-[#132a63] transition-colors"
          >
            Proceed to Payment
          </button>
        </>
      )}
    </div>
  );
}