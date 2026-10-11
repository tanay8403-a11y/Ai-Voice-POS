/**
 * Reusable product table — click-to-add mode for Billing, click-to-edit
 * mode for the Products management page. Behavior controlled via the
 * `mode` prop so one component serves both use cases.
 */

import { useState } from "react";
import { formatCurrency } from "../../utils/currency";

export default function ProductTable({ products, loading, onProductClick, mode = "add" }) {
  const [search, setSearch] = useState("");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-sm text-slate-400 py-8 text-center">Loading products…</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <input
        type="text"
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full text-sm bg-slate-100 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
      />

      <div className="overflow-y-auto max-h-96">
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-200 sticky top-0 bg-white">
              <th className="text-left py-2 pr-2">Name</th>
              <th className="text-left py-2 pr-2">SKU</th>
              <th className="text-left py-2 pr-2">Category</th>
              <th className="text-right py-2 pr-2">Price</th>
              <th className="text-right py-2 pr-2">Tax %</th>
              {mode === "edit" && <th className="text-left py-2">Status</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={mode === "edit" ? 6 : 5} className="text-center text-sm text-slate-400 py-8">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  onClick={() => onProductClick?.(product)}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 pr-2 text-sm font-medium text-slate-800">{product.name}</td>
                  <td className="py-2.5 pr-2 text-sm text-slate-500">{product.sku}</td>
                  <td className="py-2.5 pr-2 text-sm text-slate-500">{product.category || "—"}</td>
                  <td className="py-2.5 pr-2 text-sm text-slate-700 text-right">{formatCurrency(product.price)}</td>
                  <td className="py-2.5 pr-2 text-sm text-slate-500 text-right">{product.tax_percent}%</td>
                  {mode === "edit" && (
                    <td className="py-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          product.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}