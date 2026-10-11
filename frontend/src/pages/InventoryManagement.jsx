import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Banknote,
  Download,
  FileUp,
  Lightbulb,
  Mic,
  Package,
  Pencil,
  Plus,
  Search,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getTopProducts } from "../services/reports";
import {
  adjustStock,
  applyPdfRestock,
  getInventory,
  listInventory,
  previewPdfRestock,
  updateProduct,
} from "../services/products";
import { useNotify } from "../components/common/Notification";
import { formatQuantity } from "../utils/formatter";
import "./InventoryManagement.css";

const PAGE_SIZE = 8;

function getStockStatus(item) {
  if (item.quantity <= 0) return "out";
  if (item.quantity <= item.reorder_level) return "low";
  return "in";
}

function csvValue(value) {
  const safeValue = /^[=+\-@\t\r]/.test(String(value)) ? `'${value}` : value;
  return `"${String(safeValue ?? "").replaceAll('"', '""')}"`;
}

function SummaryCard({ label, value, detail, icon: Icon, tone = "blue" }) {
  const styles = {
    blue: "bg-[#eef2ff] text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{detail}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${styles[tone]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [applyingPdf, setApplyingPdf] = useState(false);
  const [pdfFilename, setPdfFilename] = useState("");
  const [restockItems, setRestockItems] = useState([]);
  const [fastMovers, setFastMovers] = useState([]);
  const [loadingFastMovers, setLoadingFastMovers] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [page, setPage] = useState(1);
  const pdfInputRef = useRef(null);
  const notify = useNotify();
  const navigate = useNavigate();

  const loadInventory = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      setInventory(await listInventory());
    } catch (err) {
      notify(err.response?.data?.detail || "Failed to load inventory.", "error");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadInventory();
    const refreshWhenVisible = () => {
      if (!document.hidden) loadInventory(false);
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadInventory]);

  useEffect(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    getTopProducts(3, startOfToday.toISOString(), endOfToday.toISOString())
      .then(setFastMovers)
      .catch((err) => {
        notify(err.response?.data?.detail || "Could not load today's fast movers.", "error");
      })
      .finally(() => setLoadingFastMovers(false));
  }, [notify]);

  const categories = useMemo(
    () => [...new Set(inventory.map((item) => item.category).filter(Boolean))].sort(),
    [inventory]
  );
  const lowStock = inventory.filter(
    (item) => item.quantity > 0 && item.quantity <= item.reorder_level
  );
  const outOfStock = inventory.filter((item) => item.quantity <= 0);
  const reorderItems = inventory
    .filter((item) => item.quantity <= item.reorder_level)
    .sort((a, b) => a.quantity - b.quantity);
  const reorderEstimate = reorderItems.reduce(
    (total, item) => total + Math.max(0, item.reorder_level - item.quantity) * item.cost_price,
    0
  );
  const stockValuation = inventory.reduce(
    (total, item) => total + Number(item.cost_price || 0) * Number(item.quantity || 0),
    0
  );

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = inventory.filter((item) => {
      const matchesSearch = !query
        || [item.product_name, item.sku, item.category]
          .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesCategory = category === "all" || item.category === category;
      const matchesStock = stockFilter === "all"
        || getStockStatus(item) === stockFilter
        || (stockFilter === "reorder" && item.quantity <= item.reorder_level);
      return matchesSearch && matchesCategory && matchesStock;
    });

    if (sortBy === "quantity") return filtered.sort((a, b) => a.quantity - b.quantity);
    if (sortBy === "price") return filtered.sort((a, b) => b.selling_price - a.selling_price);
    return filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [inventory, search, category, stockFilter, sortBy]);

  useEffect(() => setPage(1), [search, category, stockFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredInventory.length / PAGE_SIZE));
  const visibleItems = filteredInventory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdjust = async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await adjustStock(
        adjustModal.id,
        form.movement_type.value,
        Number(form.quantity.value),
        form.reason.value
      );
      notify("Stock updated.", "success");
      const updated = await getInventory(adjustModal.id);
      setInventory((current) =>
        current.map((item) => item.product_id === adjustModal.id ? { ...item, ...updated } : item)
      );
      setAdjustModal(null);
    } catch (err) {
      notify(err.response?.data?.detail || "Adjustment failed.", "error");
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPdfLoading(true);
    setPdfFilename(file.name);
    setRestockItems([]);
    try {
      const preview = await previewPdfRestock(file);
      setRestockItems(preview.items.map((item, index) => ({
        ...item,
        row_id: `${index}-${item.product_name}`,
        product_id: item.matched_product_id ? String(item.matched_product_id) : null,
        selling_price: item.selling_price ?? item.matched_selling_price ?? "",
      })));
      const unmatchedCount = preview.items.filter((item) => !item.matched_product_id).length;
      notify(
        unmatchedCount
          ? `${preview.items.length} row(s) extracted; ${unmatchedCount} new catalog product(s) will be created when applied.`
          : `${preview.items.length} product row(s) matched. Review before applying.`,
        unmatchedCount ? "info" : "success"
      );
    } catch (err) {
      notify(err.response?.data?.detail || "Could not read the PDF.", "error");
    } finally {
      setPdfLoading(false);
    }
  };

  const updateRestockItem = (rowId, field, value) => {
    setRestockItems((current) =>
      current.map((item) => {
        if (item.row_id !== rowId) return item;
        const updated = { ...item, [field]: value };
        const cost = Number(updated.cost_price);
        if (field === "profit_amount" && value !== "") {
          updated.selling_price = (cost + Number(value)).toFixed(2);
        } else if (field === "selling_price" && value !== "") {
          updated.profit_amount = (Number(value) - cost).toFixed(2);
        } else if (field === "cost_price" && updated.profit_amount !== "" && updated.profit_amount != null) {
          updated.selling_price = (cost + Number(updated.profit_amount)).toFixed(2);
        }
        return updated;
      })
    );
  };

  const saveCatalogProduct = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;

    setSavingProduct(true);
    try {
      await updateProduct(editingProduct.product_id, {
        name: editingProduct.product_name.trim(),
        category: editingProduct.category.trim() || null,
        cost_price: Number(editingProduct.cost_price),
        price: Number(editingProduct.selling_price),
      });
      notify("Catalog product updated.", "success");
      setEditingProduct(null);
      await loadInventory(false);
    } catch (err) {
      notify(err.response?.data?.detail || "Could not update the catalog product.", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleApplyPdfRestock = async (e) => {
    e.preventDefault();
    const productIds = restockItems
      .map((item) => item.product_id)
      .filter(Boolean);
    if (new Set(productIds).size !== productIds.length) {
      notify("A product can only be selected once. Remove or combine duplicate rows.", "error");
      return;
    }

    setApplyingPdf(true);
    try {
      await applyPdfRestock(restockItems.map((item) => ({
        product_id: item.product_id ? Number(item.product_id) : null,
        product_name: item.product_name,
        quantity: Number(item.quantity),
        cost_price: Number(item.cost_price),
        selling_price: item.selling_price === "" ? null : Number(item.selling_price),
        profit_amount: item.profit_amount == null || item.profit_amount === ""
          ? null
          : Number(item.profit_amount),
        category: item.category || null,
      })));
      notify("PDF restock applied. Inventory and catalog updated.", "success");
      setRestockItems([]);
      await loadInventory(false);
    } catch (err) {
      notify(err.response?.data?.detail || "Could not apply the PDF restock.", "error");
    } finally {
      setApplyingPdf(false);
    }
  };

  const exportCsv = (items = filteredInventory, filename = "inventory.csv") => {
    const headers = ["Product", "SKU", "Category", "Quantity", "Unit", "Purchase Amount", "Selling Amount", "Profit Margin", "Reorder Level"];
    const rows = items.map((item) => [
      item.product_name,
      item.sku,
      item.category,
      item.quantity,
      item.unit,
      item.cost_price,
      item.selling_price,
      item.profit_margin == null ? "" : `${item.profit_margin}%`,
      item.reorder_level,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading inventory…</div>;
  }

  return (
    <section className="inventory-page">
      <div className="mx-auto w-full max-w-[1840px] space-y-5">
        <section className="inventory-page-header">
          <div className="inventory-page-title">
            <div className="inventory-eyebrow">
              <span>Catalog &amp; Warehouse</span>
              <span className="inventory-eyebrow-dot" />
              <span>Inventory overview</span>
            </div>
            <h1>Inventory Management</h1>
            <p>Manage catalog products, stock levels, categories, and pricing.</p>
          </div>
          <div className="inventory-header-actions">
            <button type="button" onClick={exportCsv} className="inventory-action-secondary">
              <Download size={17} /> Export CSV
            </button>
            <button type="button" onClick={() => pdfInputRef.current?.click()} disabled={pdfLoading} className="inventory-action-secondary">
              <FileUp size={17} /> {pdfLoading ? "Scanning PDF…" : "Upload PDF"}
            </button>
            <input ref={pdfInputRef} type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} disabled={pdfLoading} className="hidden" />
            <button type="button" onClick={() => navigate("/billing")} className="inventory-action-voice">
              <Mic size={17} /> Voice Stock Audit
            </button>
            <button type="button" onClick={() => navigate("/products")} className="inventory-action-primary">
              <Plus size={19} /> Add Product
            </button>
          </div>
        </section>

        {pdfFilename && (
          <p className="text-xs text-slate-500" role="status">
            {pdfLoading ? "Reading" : "Selected"}: {pdfFilename}
          </p>
        )}

        <section className="inventory-summary-grid">
          <SummaryCard label="Total Products" value={inventory.length} detail="Active catalog items" icon={Package} />
          <SummaryCard label="Low Stock Alert" value={lowStock.length} detail="At or below reorder level" icon={AlertTriangle} tone="amber" />
          <SummaryCard label="Out of Stock" value={outOfStock.length} detail="Products with no stock" icon={Boxes} tone="red" />
          <SummaryCard label="Stock Valuation" value={`₹${stockValuation.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} detail="At current purchase prices" icon={Banknote} tone="green" />
        </section>

        {lowStock.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p><strong>{lowStock.length} product(s)</strong> are at or below their reorder level.</p>
          </div>
        )}

        <section className="space-y-4 rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <label className="relative md:col-span-5">
              <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, or category…" className="w-full rounded-lg border-0 bg-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20" />
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border-0 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#1e3a8a]/20 md:col-span-3">
              <option value="all">All Categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="rounded-lg border-0 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#1e3a8a]/20 md:col-span-2">
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="reorder">Needs Reorder</option>
              <option value="out">Out of Stock</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border-0 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 focus:ring-2 focus:ring-[#1e3a8a]/20 md:col-span-2">
              <option value="name">Sort: A to Z</option>
              <option value="quantity">Sort: Lowest Stock</option>
              <option value="price">Sort: Highest Price</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="self-center pr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Quick tags:</span>
            <button type="button" onClick={() => { setCategory("all"); setStockFilter("all"); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${category === "all" && stockFilter === "all" ? "bg-blue-100 text-[#1e3a8a]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              All Products
            </button>
            {categories.slice(0, 4).map((value) => (
              <button key={value} type="button" onClick={() => { setCategory(value); setStockFilter("all"); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${category === value ? "bg-blue-100 text-[#1e3a8a]" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {value}
              </button>
            ))}
            <button type="button" onClick={() => { setCategory("all"); setStockFilter("reorder"); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${stockFilter === "reorder" ? "bg-amber-100 text-amber-800" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
              Needs Reorder ({lowStock.length + outOfStock.length})
            </button>
          </div>

          {restockItems.length > 0 && (
            <form onSubmit={handleApplyPdfRestock} className="rounded-lg border border-blue-200 bg-[#f0f4ff] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-800">Review PDF restock</h2>
                  <p className="text-xs text-slate-500">Review quantity, purchase amount, and selling amount before applying.</p>
                </div>
                <button type="button" aria-label="Close PDF review" onClick={() => setRestockItems([])} className="rounded p-1 text-slate-500 hover:bg-white"><X size={18} /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1220px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="py-2 pr-3">Product</th><th className="py-2 pr-3">Category</th><th className="py-2 pr-3 text-right">Quantity</th><th className="py-2 pr-3 text-right">Purchase Amount</th><th className="py-2 pr-3 text-right">Profit Amount</th><th className="py-2 pr-3 text-right">Selling Amount</th><th className="py-2 text-right">Profit Margin</th><th /></tr>
                  </thead>
                  <tbody>
                    {restockItems.map((item) => (
                      <tr key={item.row_id} className="border-t border-blue-200">
                        <td className="py-2 pr-3">
                          <input aria-label={`Product name for ${item.product_name}`} type="text" required maxLength="150" value={item.product_name} onChange={(e) => updateRestockItem(item.row_id, "product_name", e.target.value)} className="w-44 rounded-md border-0 bg-white px-2 py-2 text-sm text-slate-700" />
                          {!item.product_id && (
                            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#1e3a8a]">
                              New product
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <input aria-label={`Category for ${item.product_name}`} type="text" maxLength="100" value={item.category || ""} onChange={(e) => updateRestockItem(item.row_id, "category", e.target.value)} className="w-32 rounded-md border-0 bg-white px-2 py-2 text-sm text-slate-600" placeholder="Category" />
                        </td>
                        <td className="py-2 pr-3">
                          <input aria-label={`Quantity for ${item.product_name}`} type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(e) => updateRestockItem(item.row_id, "quantity", e.target.value)} className="ml-auto block w-24 rounded-md border-0 bg-white px-2 py-2 text-right" />
                        </td>
                        <td className="py-2 pr-3">
                          <input aria-label={`Purchase amount for ${item.product_name}`} type="number" min="0" step="0.01" required value={item.cost_price} onChange={(e) => updateRestockItem(item.row_id, "cost_price", e.target.value)} className="ml-auto block w-28 rounded-md border-0 bg-white px-2 py-2 text-right" />
                        </td>
                        <td className="py-2 pr-3">
                          <input aria-label={`Profit amount for ${item.product_name}`} type="number" step="0.01" value={item.profit_amount ?? ""} onChange={(e) => updateRestockItem(item.row_id, "profit_amount", e.target.value === "" ? "" : e.target.value)} className="ml-auto block w-28 rounded-md border-0 bg-white px-2 py-2 text-right" placeholder="Optional" />
                        </td>
                        <td className="py-2 pr-3">
                          <input aria-label={`Selling amount for ${item.product_name}`} type="number" min="0" step="0.01" value={item.selling_price} onChange={(e) => updateRestockItem(item.row_id, "selling_price", e.target.value)} className="ml-auto block w-28 rounded-md border-0 bg-white px-2 py-2 text-right" placeholder="Optional" />
                        </td>
                        <td className="py-2 text-right text-sm font-medium text-slate-700">
                          {item.selling_price === "" || Number(item.selling_price) <= 0
                            ? "—"
                            : `${(((Number(item.selling_price) - Number(item.cost_price)) / Number(item.selling_price)) * 100).toFixed(2)}%`}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <button type="button" onClick={() => setRestockItems((current) => current.filter((row) => row.row_id !== item.row_id))} className="text-xs font-semibold text-rose-700 hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setRestockItems([])} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={applyingPdf || restockItems.length === 0} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{applyingPdf ? "Applying…" : "Apply Restock"}</button>
              </div>
            </form>
          )}

          <div id="inventory-table" className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="inventory-data-table border-collapse text-left">
              <colgroup>
                <col className="inventory-product-column" />
                <col className="inventory-category-column" />
                <col className="inventory-money-column" />
                <col className="inventory-money-column" />
                <col className="inventory-margin-column" />
                <col className="inventory-stock-column" />
                <col className="inventory-actions-column" />
              </colgroup>
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product &amp; SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Purchase Amount</th>
                  <th className="px-4 py-3 text-right">Selling Amount</th>
                  <th className="inventory-margin-heading px-4 py-3 text-right">Profit Margin</th>
                  <th className="inventory-stock-heading px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => {
                  const status = getStockStatus(item);
                  const statusStyle = status === "out"
                    ? "bg-rose-100 text-rose-800"
                    : status === "low"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800";
                  return (
                    <tr key={item.product_id} className={`group transition-colors hover:bg-slate-50 ${status === "out" ? "bg-rose-50/40" : status === "low" ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#1e3a8a]"><Package size={20} /></div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{item.product_name}</p>
                            <p className="text-xs text-slate-400">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{item.category || "Uncategorized"}</span></td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-700">₹{Number(item.cost_price).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-semibold text-slate-800">₹{Number(item.selling_price).toFixed(2)}</td>
                      <td className="inventory-margin-cell whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-700">
                        <span className="inventory-margin-value">
                          {item.profit_margin == null ? "—" : `${Number(item.profit_margin).toFixed(2)}%`}
                        </span>
                      </td>
                      <td className="inventory-stock-cell px-4 py-3.5">
                        <div className="inventory-stock-content">
                          <div className="inventory-stock-summary">
                          <span className={`h-2.5 w-2.5 rounded-full ${status === "out" ? "bg-rose-500" : status === "low" ? "bg-amber-500" : "bg-emerald-500"}`} />
                          <span className={`whitespace-nowrap text-sm ${status !== "in" ? "font-semibold" : ""} ${status === "out" ? "text-rose-700" : status === "low" ? "text-amber-700" : "text-slate-700"}`}>{formatQuantity(item.quantity, item.unit)}</span>
                          <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${statusStyle}`}>{status === "out" ? "Out of Stock" : status === "low" ? "Low Stock" : "In Stock"}</span>
                          </div>
                          <p>Reorder at {item.reorder_level}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button type="button" title="Edit product" onClick={() => setEditingProduct({ ...item })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1e3a8a]"><Pencil size={17} /></button>
                          <button type="button" title="Restock product" onClick={() => setAdjustModal({ id: item.product_id, name: item.product_name })} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${status === "out" ? "bg-rose-600 text-white hover:bg-rose-700" : status === "low" ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "text-emerald-700 hover:bg-emerald-50"}`}>Restock</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleItems.length === 0 && (
                  <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-500">No products match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing <strong className="text-slate-700">{filteredInventory.length ? (page - 1) * PAGE_SIZE + 1 : 0}</strong> to{" "}
              <strong className="text-slate-700">{Math.min(page * PAGE_SIZE, filteredInventory.length)}</strong> of{" "}
              <strong className="text-slate-700">{filteredInventory.length}</strong> products
            </p>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40">Previous</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} className={`h-8 w-8 rounded-lg text-xs font-semibold ${page === pageNumber ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-white"}`}>{pageNumber}</button>
              ))}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><TrendingUp size={18} className="text-emerald-700" /> Top Fast Movers (Today)</h2>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Paid sales</span>
            </div>
            {loadingFastMovers ? (
              <p className="text-xs text-slate-500">Loading today’s sales…</p>
            ) : fastMovers.length === 0 ? (
              <p className="text-xs text-slate-500">No paid product sales recorded today.</p>
            ) : (
              <div className="space-y-3">
                {fastMovers.map((item, index) => {
                  const maxSold = Math.max(...fastMovers.map((product) => product.total_quantity_sold));
                  const width = Math.max(8, (item.total_quantity_sold / maxSold) * 100);
                  return (
                    <div key={item.product_id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700">{item.name}</span>
                        <span className="shrink-0 font-semibold text-emerald-700">{item.total_quantity_sold} sold</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className={`h-1.5 rounded-full ${index === 0 ? "bg-emerald-700" : "bg-emerald-500"}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Mic size={18} className="text-[#1e3a8a]" /> Inventory Shortcuts</h2>
              <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a]">Quick tips</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              <li><span className="font-semibold text-[#1e3a8a]">“Stock count”</span> — query an item’s quantity</li>
              <li><span className="font-semibold text-[#1e3a8a]">“Add 20 units to rice”</span> — restock by voice</li>
              <li>
                <button type="button" onClick={() => { setCategory("all"); setStockFilter("out"); document.getElementById("inventory-table")?.scrollIntoView({ behavior: "smooth" }); }} className="text-left hover:underline">
                  <span className="font-semibold text-[#1e3a8a]">Highlight out of stock</span> — filter the table
                </button>
              </li>
              <li>
                <button type="button" onClick={() => exportCsv(reorderItems, "low-stock-inventory.csv")} className="text-left hover:underline">
                  <span className="font-semibold text-[#1e3a8a]">Export low stock CSV</span> — download reorder items
                </button>
              </li>
            </ul>
            <button type="button" onClick={() => navigate("/billing")} className="mt-4 w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#1e3a8a] hover:text-white">Open Voice Billing</button>
          </div>
          <div className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm">
            <div>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Truck size={18} className="text-amber-600" /> Suggested Restock</h2>
              <p className="text-xs leading-5 text-slate-600">
                {reorderItems.length
                  ? `${reorderItems.length} item(s) are at or below their reorder threshold. Estimated cost to reach those thresholds: ₹${reorderEstimate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}.`
                  : "No products currently need restocking."}
              </p>
              {reorderItems.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-500">Items:</span>
                  {reorderItems.slice(0, 3).map((item) => (
                    <span key={item.product_id} className="max-w-full truncate rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{item.product_name}</span>
                  ))}
                  {reorderItems.length > 3 && <span className="text-[10px] text-slate-500">+{reorderItems.length - 3} more</span>}
                </div>
              )}
            </div>
            <button type="button" onClick={() => { setCategory("all"); setStockFilter("reorder"); document.getElementById("inventory-table")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-[#1e3a8a] hover:text-white">
              <Lightbulb size={14} /> Review Suggested Items
            </button>
          </div>
        </section>
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleAdjust} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-800">Restock — {adjustModal.name}</h3>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Movement Type</label>
            <select name="movement_type" required className="mb-3 w-full rounded-md bg-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20">
              <option value="in">Stock In (restock)</option><option value="out">Stock Out</option><option value="adjustment">Adjustment</option><option value="return">Return</option>
            </select>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
            <input name="quantity" type="number" step="0.01" min="0.01" required className="mb-3 w-full rounded-md bg-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20" />
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</label>
            <input name="reason" type="text" placeholder="e.g. Supplier delivery" className="mb-5 w-full rounded-md bg-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20" />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-[#1e3a8a] py-2.5 text-sm font-semibold text-white hover:bg-[#173274]">Apply</button>
              <button type="button" onClick={() => setAdjustModal(null)} className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
            </div>
          </form>
        </div>
      )}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={saveCatalogProduct} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Edit catalog product</h3>
              <button type="button" aria-label="Close edit product" onClick={() => setEditingProduct(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Product name
                <input required maxLength="150" value={editingProduct.product_name} onChange={(e) => setEditingProduct((current) => ({ ...current, product_name: e.target.value }))} className="mt-1 w-full rounded-md bg-slate-100 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Category
                <input maxLength="100" value={editingProduct.category === "Uncategorized" ? "" : editingProduct.category} onChange={(e) => setEditingProduct((current) => ({ ...current, category: e.target.value }))} className="mt-1 w-full rounded-md bg-slate-100 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Purchase amount
                <input required type="number" min="0" step="0.01" value={editingProduct.cost_price} onChange={(e) => setEditingProduct((current) => ({ ...current, cost_price: e.target.value }))} className="mt-1 w-full rounded-md bg-slate-100 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Selling amount
                <input required type="number" min="0" step="0.01" value={editingProduct.selling_price} onChange={(e) => setEditingProduct((current) => ({ ...current, selling_price: e.target.value }))} className="mt-1 w-full rounded-md bg-slate-100 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            <p className="mt-3 text-right text-xs text-slate-500">
              Profit margin: {Number(editingProduct.selling_price) > 0
                ? `${(((Number(editingProduct.selling_price) - Number(editingProduct.cost_price)) / Number(editingProduct.selling_price)) * 100).toFixed(2)}%`
                : "—"}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingProduct(null)} className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
              <button type="submit" disabled={savingProduct} className="rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173274] disabled:opacity-60">{savingProduct ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
