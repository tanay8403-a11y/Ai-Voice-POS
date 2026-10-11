import { Package, Plus, Search } from "lucide-react";

export default function ProductHeader({ search, setSearch, onAddProduct, canManageProducts }) {
  return (
    <header className="products-page-header">
      <div className="products-title">
        <span className="products-title-icon"><Package size={20} /></span>
        <div>
          <p className="products-eyebrow">CATALOG &amp; WAREHOUSE</p>
          <h1>Products</h1>
          <p className="products-subtitle">
            {canManageProducts
              ? "Manage your catalog, pricing, and stock in one place."
              : "Browse product details and availability for customer sales."}
          </p>
        </div>
      </div>

      <div className="products-header-actions">
        <label className="products-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, SKU, or category"
          />
        </label>
        {canManageProducts && (
          <button type="button" onClick={onAddProduct} className="products-add-button">
            <Plus size={18} />
            Add product
          </button>
        )}
      </div>
    </header>
  );
}
