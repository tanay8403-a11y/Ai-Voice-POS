/**
 * Product search bar for the billing screen — lets the cashier find a
 * product by name/SKU and add it to the cart manually, as a fallback
 * alongside voice and barcode scanning. Debounced to avoid firing a
 * request on every keystroke.
 */

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import { listProducts } from "../../services/products";
import { formatCurrency } from "../../utils/currency";

export default function ProductSearch({ onProductSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await listProducts({ search: query, limit: 8 });
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onProductSelect(product);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search products by name or SKU…"
          className="w-full text-sm bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
        />
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {loading && <p className="text-xs text-slate-400 px-3 py-2.5">Searching…</p>}

          {!loading && results.length === 0 && (
            <p className="text-xs text-slate-400 px-3 py-2.5">No products found.</p>
          )}

          {!loading &&
            results.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-400">SKU: {product.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{formatCurrency(product.price)}</span>
                  <Plus size={16} className="text-[#0B1E4A]" />
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}