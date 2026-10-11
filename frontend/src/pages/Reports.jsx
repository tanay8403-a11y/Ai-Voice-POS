/**
 * Reports & Analytics page styled to the supplied mockup. Uses the existing
 * reports API; no placeholder sales values or fake charts are inserted.
 */

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarDays, Download, FileText, CreditCard, TrendingUp } from "lucide-react";
import { getSalesSummary, getTopProducts, getPaymentBreakdown } from "../services/reports";
import { useNotify } from "../components/common/Notification";

const inr = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const notify = useNotify();

  const loadReports = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      notify("The start date must be before the end date.", "error");
      return;
    }

    setLoading(true);
    const results = await Promise.allSettled([
      getSalesSummary(startDate || undefined, endDate || undefined),
      getTopProducts(10, startDate || undefined, endDate || undefined),
      getPaymentBreakdown(startDate || undefined, endDate || undefined),
    ]);

    const [summaryResult, productsResult, paymentResult] = results;

    if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
    else notify("Failed to load sales summary.", "error");

    if (productsResult.status === "fulfilled") setTopProducts(Array.isArray(productsResult.value) ? productsResult.value : []);
    else notify("Failed to load top products.", "error");

    if (paymentResult.status === "fulfilled") setPaymentBreakdown(Array.isArray(paymentResult.value) ? paymentResult.value : []);
    else notify("Failed to load payment breakdown.", "error");

    setHasLoaded(true);
    setLoading(false);
  }, [startDate, endDate, notify]);

  useEffect(() => {
    loadReports();
  }, []); // Load the default date range once on mount.

  const exportReport = () => {
    const rows = [
      ["Section", "Name", "Count / Quantity", "Amount (INR)"],
      ["Summary", "Revenue", "", summary?.total_revenue ?? ""],
      ["Summary", "Invoices", summary?.invoice_count ?? "", ""],
      ["Summary", "Average bill", "", summary?.average_bill_value ?? ""],
      ["Summary", "Discounts given", "", summary?.total_discounts_given ?? ""],
      ...topProducts.map((product) => ["Top product", product.name, product.total_quantity_sold, product.total_revenue]),
      ...paymentBreakdown.map((payment) => ["Payment method", payment.method, payment.transaction_count, payment.total_amount]),
    ];
    const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "voice-ai-pos-report.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1e4a] via-[#1e3a8a] to-[#254a9b] px-5 py-6 text-white shadow-sm sm:px-7 lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[26px] border-white/10" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <BarChart3 size={14} /> Analytics & insights
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Reports & Analytics</h1>
            <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
              Review sales totals, best-selling products, and payment-method performance from your actual POS records.
            </p>
          </div>
          <button
            type="button"
            onClick={exportReport}
            disabled={!hasLoaded || loading}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1e3a8a] shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} /> Export Report
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <CalendarDays size={15} className="text-[#1e3a8a]" /> Report date range
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
              <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="rounded-lg border border-slate-200 bg-[#f8f9fb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/15" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
              <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="rounded-lg border border-slate-200 bg-[#f8f9fb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/15" />
            </label>
            <button type="button" onClick={loadReports} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173274] disabled:opacity-60">
              <TrendingUp size={16} /> {loading ? "Loading…" : "Apply Filter"}
            </button>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-600" /> Loaded from POS reports
        </span>
      </section>

      {loading && !hasLoaded ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">Loading report data…</div>
      ) : (
        <>
          {summary && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={TrendingUp} label="Total Revenue" value={inr(summary.total_revenue)} detail="Paid invoices in selected period" />
              <StatCard icon={FileText} label="Invoices" value={Number(summary.invoice_count || 0).toLocaleString("en-IN")} detail="Completed sales" />
              <StatCard icon={BarChart3} label="Average Bill" value={inr(summary.average_bill_value)} detail="Average invoice value" />
              <StatCard icon={CreditCard} label="Discounts Given" value={inr(summary.total_discounts_given)} detail="Total discounts applied" />
            </section>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Top Products</h2>
                  <p className="mt-1 text-sm text-slate-500">Ranked by sales data in the selected range.</p>
                </div>
                <span className="rounded-lg bg-blue-50 p-2 text-[#1e3a8a]"><BarChart3 size={18} /></span>
              </div>
              {topProducts.length === 0 ? (
                <p className="rounded-xl bg-[#f8f9fb] px-4 py-10 text-center text-sm text-slate-500">No product sales found for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead><tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="py-3 pr-4">Product</th><th className="py-3 pr-4 text-right">Units Sold</th><th className="py-3 text-right">Revenue</th></tr></thead>
                    <tbody>{topProducts.map((product, index) => (
                      <tr key={product.product_id ?? `${product.name}-${index}`} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-800">{product.name}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{product.total_quantity_sold}</td>
                        <td className="py-3 text-right font-semibold tabular-nums text-slate-900">{inr(product.total_revenue)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Payment Methods</h2>
                  <p className="mt-1 text-sm text-slate-500">Transaction count and collected amount by method.</p>
                </div>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CreditCard size={18} /></span>
              </div>
              {paymentBreakdown.length === 0 ? (
                <p className="rounded-xl bg-[#f8f9fb] px-4 py-10 text-center text-sm text-slate-500">No payment data found for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-sm">
                    <thead><tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500"><th className="py-3 pr-4">Method</th><th className="py-3 pr-4 text-right">Transactions</th><th className="py-3 text-right">Total</th></tr></thead>
                    <tbody>{paymentBreakdown.map((payment, index) => (
                      <tr key={payment.method ?? index} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-semibold uppercase text-slate-800">{payment.method}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-slate-600">{payment.transaction_count}</td>
                        <td className="py-3 text-right font-semibold tabular-nums text-slate-900">{inr(payment.total_amount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="absolute right-3 top-3 text-[#1e3a8a]/10"><Icon size={54} /></div>
      <div className="relative">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
        <p className="mt-2 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
