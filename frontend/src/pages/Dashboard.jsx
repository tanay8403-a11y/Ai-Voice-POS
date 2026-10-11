import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  AudioLines,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  IndianRupee,
  LayoutDashboard,
  Package,
  RefreshCw,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Users,
  Volume2,
} from "lucide-react";
import CashierTable from "../components/owner/CashierTable";
import RolePermissions from "../components/owner/RolePermissions";
import VoiceAnalytics from "../components/analytics/VoiceAnalytics";
import CommandAnalytics from "../components/analytics/CommandAnalytics";
import { useAuthContext } from "../context/AuthContext";
import { getDashboardStats, getRecentInvoices } from "../services/billing";
import { getMyStore } from "../services/authServices";
import {
  getLowStockAlerts,
} from "../services/products";
import {
  getPaymentBreakdown,
  getRevenueTrend,
  getSalesSummary,
  getTopProducts,
  getVoiceAnalytics,
} from "../services/reports";
import { formatCurrency } from "../utils/currency";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "staff", label: "Staff", icon: Users },
  { id: "voice", label: "Voice Analytics", icon: AudioLines },
  { id: "permissions", label: "Permissions", icon: ShieldCheck },
];

const EMPTY_DASHBOARD = {
  stats: null,
  summary: null,
  products: [],
  payments: [],
  voice: null,
  lowStock: [],
};

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getPresetRange(preset, startDate, endDate) {
  const now = new Date();
  let start;
  let end = now;

  if (preset === "week") {
    start = startOfLocalDay(now);
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "custom" && startDate && endDate) {
    start = new Date(`${startDate}T00:00:00`);
    end = new Date(`${endDate}T23:59:59.999`);
  } else {
    start = startOfLocalDay(now);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

function localDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function downloadCsv(filename, rows) {
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function OwnerDashboard() {
  const { user } = useAuthContext();
  const [tab, setTab] = useState("overview");
  const [preset, setPreset] = useState("today");
  const [customStart, setCustomStart] = useState(localDateInput(new Date()));
  const [customEnd, setCustomEnd] = useState(localDateInput(new Date()));
  const [customApplied, setCustomApplied] = useState(null);
  const [store, setStore] = useState(null);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);

  const dateRange = useMemo(() => {
    if (preset === "custom" && customApplied) {
      return getPresetRange("custom", customApplied.start, customApplied.end);
    }
    return getPresetRange(preset);
  }, [preset, customApplied]);
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const requests = [
      getDashboardStats(),
      getSalesSummary(dateRange.start, dateRange.end),
      getTopProducts(5, dateRange.start, dateRange.end),
      getPaymentBreakdown(dateRange.start, dateRange.end),
      getVoiceAnalytics(dateRange.start, dateRange.end),
      getLowStockAlerts(),
      getMyStore(),
    ];
    const labels = [
      "sales overview",
      "selected-period sales",
      "top products",
      "payment breakdown",
      "voice metrics",
      "inventory alerts",
      "store details",
    ];
    const results = await Promise.allSettled(requests);
    const nextErrors = [];
    const nextData = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const keys = ["stats", "summary", "products", "payments", "voice", "lowStock", "store"];
        nextData[keys[index]] = result.value;
      } else {
        const message = result.reason?.response?.data?.detail || result.reason?.message || "Request failed";
        nextErrors.push(`${labels[index]}: ${message}`);
      }
    });
    setDashboard((current) => ({ ...current, ...nextData }));
    if (Object.hasOwn(nextData, "store")) setStore(nextData.store);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 60000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const handleRefresh = () => {
    setInvoiceRefreshKey((key) => key + 1);
    loadDashboard();
  };

  const applyCustomRange = (event) => {
    event.preventDefault();
    if (!customStart || !customEnd || customStart > customEnd) return;
    setCustomApplied({ start: customStart, end: customEnd });
    setPreset("custom");
  };

  const exportAudit = async () => {
    const rows = [
      ["Invoice", "Created", "Customer", "Cashier", "Products", "Payment", "Total", "Status"],
    ];
    try {
      const firstPage = await getRecentInvoices({ limit: 100 });
      const invoices = [...firstPage.items];
      for (let offset = invoices.length; offset < firstPage.total; offset += 100) {
        const page = await getRecentInvoices({ limit: 100, offset });
        invoices.push(...page.items);
      }
      invoices.forEach((invoice) => rows.push([
        invoice.invoice_number,
        new Date(invoice.created_at).toLocaleString(),
        invoice.customer_name,
        invoice.cashier_name,
        invoice.items.map((item) => `${item.quantity} x ${item.product_name}`).join("; "),
        invoice.payment_method || "",
        invoice.total_amount,
        invoice.status,
      ]));
      downloadCsv("pos-invoice-audit.csv", rows);
    } catch (requestError) {
      setErrors((current) => [
        ...current,
        `Invoice export: ${requestError.response?.data?.detail || requestError.message || "Request failed"}`,
      ]);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-5">
      <DashboardHeader
        user={user}
        store={store}
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={handleRefresh}
        onExport={exportAudit}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:mb-0">
          <CalendarDays size={15} className="text-[#1e3a8a]" />
          Sales period
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["today", "Today"],
            ["week", "This week"],
            ["month", "This month"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreset(value)}
              aria-pressed={preset === value}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                preset === value ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          <form onSubmit={applyCustomRange} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="dashboard-start-date">Start date</label>
            <input id="dashboard-start-date" type="date" value={customStart} max={customEnd} onChange={(event) => setCustomStart(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700" />
            <span className="text-xs text-slate-400">to</span>
            <label className="sr-only" htmlFor="dashboard-end-date">End date</label>
            <input id="dashboard-end-date" type="date" value={customEnd} min={customStart} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-700" />
            <button type="submit" className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ${preset === "custom" ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
              <Check size={13} /> Apply
            </button>
          </form>
        </div>
      </section>

      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all sm:px-5 sm:text-sm ${
              tab === id
                ? "bg-[#1e3a8a] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <DashboardOverview
          dashboard={dashboard}
          errors={errors}
          loading={loading}
          invoiceRefreshKey={invoiceRefreshKey}
        chartRefreshKey={lastUpdated?.getTime() || 0}
        onRetry={loadDashboard}
        />
      )}

      {tab === "staff" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Team & access</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Staff overview</h2>
            <p className="mt-1 text-sm text-slate-500">Review staff accounts and their assigned roles.</p>
          </div>
          <CashierTable />
        </section>
      )}

      {tab === "voice" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <VoiceAnalytics startDate={dateRange.start} endDate={dateRange.end} />
          <CommandAnalytics startDate={dateRange.start} endDate={dateRange.end} />
        </div>
      )}

      {tab === "permissions" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Security</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Role permissions</h2>
          </div>
          <RolePermissions />
        </section>
      )}
    </div>
  );
}

function DashboardHeader({ user, store, lastUpdated, loading, onRefresh, onExport }) {
  const userName = user?.name || user?.email || "Owner";
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-[30px] border-slate-100" />
      <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#f4f5f7] p-3 sm:max-w-md">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1e3a8a] shadow-sm">
              <LayoutDashboard size={19} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{store?.store_name || "Your Store"}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {store?.store_code ? `Store ${store.store_code}` : "POS overview"}{store?.city ? ` · ${store.city}` : ""}
              </p>
            </div>
            <ChevronDown size={15} className="ml-1 shrink-0 text-slate-400" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-bold text-white">
              {initials || "U"}
            </span>
            <div>
              <p className="max-w-48 truncate text-xs font-semibold text-slate-800">{userName}</p>
              <p className="text-[10px] text-slate-500">{user?.role ? `${user.role} account` : "Signed in"}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`h-2 w-2 rounded-full ${loading ? "animate-pulse bg-amber-500" : "bg-emerald-500"}`} />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Connecting to POS"}
          </span>
          <Link to="/billing" className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#173274]">
            <Receipt size={15} /> New order
          </Link>
          <button type="button" onClick={onExport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <Download size={15} /> Export audit
          </button>
          <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh dashboard" title="Refresh dashboard" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </section>
  );
}

function DashboardOverview({ dashboard, errors, loading, invoiceRefreshKey, chartRefreshKey, onRetry }) {
  const {
    stats,
    summary,
    products,
    payments,
    voice,
    lowStock,
  } = dashboard;
  const metrics = [
    {
      label: "Sales revenue",
      value: summary ? formatCurrency(summary.total_revenue) : "—",
      note: summary ? `${Number(summary.invoice_count || 0).toLocaleString("en-IN")} paid invoices` : "Loading sales",
      icon: IndianRupee,
      style: "bg-blue-50 text-blue-700",
    },
    {
      label: "Average bill value",
      value: summary ? formatCurrency(summary.average_bill_value) : "—",
      note: summary ? `${Number(summary.invoice_count || 0).toLocaleString("en-IN")} invoices in period` : "Loading sales",
      icon: ShoppingBag,
      style: "bg-violet-50 text-violet-700",
    },
    {
      label: "Voice completion",
      value: voice ? `${Number(voice.completion_rate || 0).toFixed(1)}%` : "—",
      note: voice ? `${voice.completed_sessions} / ${voice.total_sessions} sessions completed` : "No voice-session data",
      icon: Volume2,
      style: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Inventory alerts",
      value: lowStock ? Number(lowStock.length).toLocaleString("en-IN") : "—",
      note: lowStock ? (lowStock.length ? "Products at or below reorder level" : "No low-stock items") : "Loading stock",
      icon: AlertTriangle,
      style: lowStock?.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <section role="status" className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-amber-900">Some dashboard data could not be refreshed.</p>
            <p className="mt-1 text-xs text-amber-800">{errors.join(" · ")}</p>
          </div>
          <button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800">Retry</button>
        </section>
      )}

      <section aria-label="POS performance metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, style }) => (
          <article key={label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
              </div>
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style}`}><Icon size={17} /></span>
            </div>
            <p className="mt-2 truncate text-[11px] text-slate-500" title={note}>{note}</p>
            {label === "Sales revenue" && stats && (
              <p className="mt-3 text-[10px] text-slate-500">
                Today {formatCurrency(stats.today_revenue)} <span className="px-1 text-slate-300">|</span> Week {formatCurrency(stats.week_revenue)}
              </p>
            )}
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]">
        <RevenueTrend refreshKey={chartRefreshKey} />
        <TopProducts products={products} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <VoiceSummary voice={voice} />
        <PaymentDistribution payments={payments} />
        <InventoryAlerts items={lowStock} />
      </section>

      <InvoiceAudit refreshKey={invoiceRefreshKey} />

      {loading && !summary && (
        <div className="sr-only" role="status">Loading dashboard information</div>
      )}
    </div>
  );
}

function RevenueTrend({ refreshKey }) {
  const [days, setDays] = useState(7);
  const [chart, setChart] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setChartLoading(true);
    setChartError("");
    getRevenueTrend(days)
      .then((data) => { if (active) setChart(Array.isArray(data) ? data : []); })
      .catch((error) => {
        if (active) setChartError(error.response?.data?.detail || "Could not load sales trend.");
      })
      .finally(() => { if (active) setChartLoading(false); });
    return () => { active = false; };
  }, [days, retryKey, refreshKey]);

  const maxValue = Math.max(...chart.map((point) => Number(point.revenue) || 0), 1);
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Revenue trend</h2>
          <p className="mt-1 text-[11px] text-slate-500">Paid invoice totals, grouped by day.</p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {[7, 30].map((range) => (
            <button key={range} type="button" onClick={() => setDays(range)} aria-pressed={days === range} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold ${days === range ? "bg-white text-[#1e3a8a] shadow-sm" : "text-slate-500"}`}>
              {range} days
            </button>
          ))}
        </div>
      </div>
      {chartLoading ? (
        <div className="grid h-44 place-items-center text-xs text-slate-500"><span><RefreshCw size={15} className="mr-2 inline animate-spin" />Loading sales trend…</span></div>
      ) : chartError ? (
        <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="grid h-44 w-full place-items-center rounded-lg bg-rose-50 px-4 text-center text-xs text-rose-800">{chartError} Click to retry.</button>
      ) : chart.length === 0 ? (
        <div className="grid h-44 place-items-center text-xs text-slate-500">No sales were recorded in this period.</div>
      ) : (
        <div className="flex h-44 items-end gap-1 border-b border-slate-200 px-1 pt-4 sm:gap-2" role="img" aria-label={`Paid revenue by day for the last ${days} days`}>
          {chart.map((point) => {
            const value = Number(point.revenue) || 0;
            const height = value ? Math.max(5, value / maxValue * 100) : 2;
            const date = new Date(`${point.date}T00:00:00`);
            return (
              <div key={point.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                  {date.toLocaleDateString()} · {formatCurrency(value)}
                </div>
                <div className={`mx-auto w-full max-w-8 rounded-t-sm transition-colors ${value ? "bg-slate-500 hover:bg-blue-700" : "bg-slate-200"}`} style={{ height: `${height}%` }} />
                {(days === 7 || chart.length < 12 || chart.indexOf(point) % 3 === 0) && (
                  <span className="mt-2 truncate text-center text-[9px] text-slate-500">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-sm bg-slate-500" /> Revenue from paid invoices</div>
    </article>
  );
}

function TopProducts({ products }) {
  const maxQuantity = Math.max(...products.map((item) => Number(item.total_quantity_sold) || 0), 1);
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-base font-bold text-slate-900">Top selling products</h2><p className="mt-1 text-[11px] text-slate-500">Ranked by units sold in the selected period.</p></div>
        <Package size={17} className="shrink-0 text-slate-400" />
      </div>
      {!products.length ? (
        <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-xs text-slate-500">No product sales recorded for this period.</p>
      ) : (
        <div className="space-y-4">
          {products.slice(0, 5).map((product, index) => (
            <div key={product.product_id || product.name} className="flex min-w-0 items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-slate-800" title={product.name}>{product.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{Number(product.total_quantity_sold).toLocaleString()} sold</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-500" style={{ width: `${Math.max(3, Number(product.total_quantity_sold) / maxQuantity * 100)}%` }} />
                </div>
              </div>
              <span className="shrink-0 text-right text-[10px] font-semibold tabular-nums text-slate-700">{formatCurrency(product.total_revenue)}</span>
            </div>
          ))}
        </div>
      )}
      <Link to="/products" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline">Open product catalog <ChevronRight size={14} /></Link>
    </article>
  );
}

function VoiceSummary({ voice }) {
  const completion = Number(voice?.completion_rate) || 0;
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><h2 className="text-sm font-bold text-slate-900">Voice assistant health</h2><p className="mt-1 text-[10px] text-slate-500">Measured from recorded voice sessions.</p></div>
        <AudioLines size={17} className="text-emerald-700" />
      </div>
      {!voice ? (
        <p className="py-5 text-center text-xs text-slate-500">Voice session metrics unavailable.</p>
      ) : voice.total_sessions === 0 ? (
        <p className="py-5 text-center text-xs text-slate-500">No voice sessions recorded in this period.</p>
      ) : (
        <>
          <div className="flex items-end gap-2"><strong className="text-3xl font-bold tracking-tight text-slate-900">{completion.toFixed(1)}%</strong><span className="pb-1 text-[10px] font-medium text-emerald-700">completed</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.max(0, completion))}%` }} /></div>
          <div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>{voice.completed_sessions} completed</span><span>{voice.failed_sessions} failed · {voice.cancelled_sessions} cancelled</span></div>
        </>
      )}
    </article>
  );
}

function PaymentDistribution({ payments }) {
  const total = payments.reduce((sum, payment) => sum + Number(payment.total_amount || 0), 0);
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><h2 className="text-sm font-bold text-slate-900">Payment tender</h2><p className="mt-1 text-[10px] text-slate-500">Successful payments in this period.</p></div>
        <CreditCard size={17} className="text-slate-500" />
      </div>
      {!payments.length ? (
        <p className="py-5 text-center text-xs text-slate-500">No successful payments recorded in this period.</p>
      ) : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Payment distribution">
            {payments.map((payment, index) => (
              <span key={payment.method} title={`${payment.method}: ${formatCurrency(payment.total_amount)}`} className={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} style={{ width: `${total > 0 ? Number(payment.total_amount) / total * 100 : 0}%` }} />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {payments.map((payment, index) => (
              <div key={payment.method} className="flex items-center gap-2 text-[10px]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${PAYMENT_DOTS[index % PAYMENT_DOTS.length]}`} />
                <span className="min-w-0 flex-1 truncate font-medium uppercase text-slate-600">{payment.method}</span>
                <span className="shrink-0 text-slate-500">{payment.transaction_count} tx</span>
                <strong className="w-20 shrink-0 text-right tabular-nums text-slate-800">{formatCurrency(payment.total_amount)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

function InventoryAlerts({ items }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><h2 className="text-sm font-bold text-slate-900">Inventory alerts</h2><p className="mt-1 text-[10px] text-slate-500">Products at or below reorder level.</p></div>
        <AlertTriangle size={17} className={items?.length ? "text-amber-600" : "text-emerald-600"} />
      </div>
      {!items ? (
        <p className="py-5 text-center text-xs text-slate-500">Inventory alerts unavailable.</p>
      ) : !items.length ? (
        <p className="py-5 text-center text-xs text-slate-500">All tracked products are above reorder level.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item) => (
            <div key={item.product_id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-[11px] font-medium text-slate-700" title={item.product_name}>{item.product_name}</span>
              <span className={`shrink-0 rounded px-1.5 py-1 text-[9px] font-bold ${Number(item.quantity) <= 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                {Number(item.quantity) <= 0 ? "Out" : `${item.quantity} left`}
              </span>
            </div>
          ))}
          {items.length > 4 && <p className="text-[10px] text-slate-500">and {items.length - 4} more alerts</p>}
        </div>
      )}
      <Link to="/inventory" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline">Review inventory <ChevronRight size={14} /></Link>
    </article>
  );
}

function InvoiceAudit({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 5;

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getRecentInvoices({ limit: pageSize, offset: page * pageSize, status: status || undefined, search: search.trim() || undefined });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load invoice activity.");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    const timeout = window.setTimeout(loadInvoices, 250);
    return () => window.clearTimeout(timeout);
  }, [loadInvoices, refreshKey]);

  const changeStatus = (event) => {
    setStatus(event.target.value);
    setPage(0);
  };
  const changeSearch = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h2 className="text-base font-bold text-slate-900">Live invoice activity</h2><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />Auto refresh</span></div>
          <p className="mt-1 text-[11px] text-slate-500">Recent invoices with actual customer, cashier, products and payment details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[190px] flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search invoices</span>
            <input type="search" value={search} onChange={changeSearch} placeholder="Invoice, customer, cashier" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400" />
          </label>
          <label className="relative">
            <span className="sr-only">Filter invoices by status</span>
            <select value={status} onChange={changeStatus} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700">
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="draft">Draft</option>
              <option value="partially_paid">Partially paid</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </label>
          <button type="button" onClick={loadInvoices} title="Refresh invoices" aria-label="Refresh invoices" disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-8">
          <p className="text-sm text-rose-700">{error}</p>
          <button type="button" onClick={loadInvoices} className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white">Retry</button>
        </div>
      ) : loading && !items.length ? (
        <p className="px-5 py-12 text-center text-xs text-slate-500">Loading invoice activity…</p>
      ) : !items.length ? (
        <p className="px-5 py-12 text-center text-xs text-slate-500">No invoices match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Cashier / customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Tender</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-[#1e3a8a]">#{invoice.invoice_number}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(invoice.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-800">{invoice.cashier_name}</p><p className="mt-0.5 text-[10px] text-slate-500">{invoice.customer_name}</p></td>
                  <td className="max-w-64 px-4 py-3 text-slate-600">{invoice.items.map((item) => `${item.quantity}× ${item.product_name}`).join(", ") || "No items"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium uppercase text-slate-600">{invoice.payment_method || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">{formatCurrency(invoice.total_amount)}</td>
                  <td className="px-4 py-3"><InvoiceStatus status={invoice.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>{total ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total} invoices` : "No invoices"}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading} aria-label="Previous invoice page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span>Page {page + 1} of {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1 || loading} aria-label="Next invoice page" className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      </div>
    </section>
  );
}

function InvoiceStatus({ status }) {
  const styles = {
    paid: "bg-emerald-50 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    partially_paid: "bg-amber-50 text-amber-800",
    refunded: "bg-violet-50 text-violet-700",
    cancelled: "bg-rose-50 text-rose-700",
  };
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold uppercase ${styles[status] || "bg-slate-100 text-slate-600"}`}>{String(status || "unknown").replaceAll("_", " ")}</span>;
}

const PAYMENT_COLORS = ["bg-slate-500", "bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-violet-500"];
const PAYMENT_DOTS = ["bg-slate-500", "bg-blue-600", "bg-emerald-600", "bg-amber-500", "bg-violet-500"];
