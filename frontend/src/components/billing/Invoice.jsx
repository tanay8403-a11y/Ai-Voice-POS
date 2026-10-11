/**
 * Invoice display/receipt component: shows a finalized invoice with
 * line items and a PDF download button.
 */

import { FileText } from "lucide-react";
import { downloadInvoicePdf } from "../../services/billing";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/formatter";

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  partially_paid: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-600",
  refunded: "bg-indigo-100 text-indigo-600",
};

export default function Invoice({ invoice }) {
  if (!invoice) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-slate-800">Invoice #{invoice.invoice_number}</h3>
        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-md ${STATUS_STYLES[invoice.status] || "bg-slate-100 text-slate-600"}`}>
          {invoice.status.replace("_", " ")}
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4">{formatDate(invoice.created_at, { includeTime: true })}</p>

      <table className="w-full">
        <thead>
          <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200">
            <th className="text-left py-2 pr-2">Item</th>
            <th className="text-center py-2 pr-2">Qty</th>
            <th className="text-right py-2 pr-2">Unit Price</th>
            <th className="text-right py-2 pr-2">Discount</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-100 last:border-0 text-sm">
              <td className="py-2.5 pr-2 text-slate-700">{item.product_name || `Product #${item.product_id}`}</td>
              <td className="py-2.5 pr-2 text-center text-slate-500">{item.quantity}</td>
              <td className="py-2.5 pr-2 text-right text-slate-500">{formatCurrency(item.unit_price)}</td>
              <td className="py-2.5 pr-2 text-right text-slate-500">{formatCurrency(item.discount)}</td>
              <td className="py-2.5 text-right font-semibold text-slate-800">{formatCurrency(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-200 mt-3 pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal:</span><span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between text-rose-500">
          <span>Discount:</span><span>-{formatCurrency(invoice.discount_amount)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Tax:</span><span>+{formatCurrency(invoice.tax_amount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-[#0B1E4A] pt-1.5 border-t border-slate-100">
          <span>Total:</span><span>{formatCurrency(invoice.total_amount)}</span>
        </div>
      </div>

      <button
        onClick={() => downloadInvoicePdf(invoice.id, invoice.invoice_number)}
        className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        <FileText size={16} /> Download PDF
      </button>
    </div>
  );
}