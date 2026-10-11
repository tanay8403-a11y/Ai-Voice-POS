import { Package, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "../../utils/currency";

export default function ProductCard({ product, onEdit, onDelete, canManageProducts }) {
  const stock = Number(product.stock ?? product.current_stock ?? 0);
  const reorderLevel = Number(product.reorder_level ?? 10);
  const stockState = stock <= 0 ? "out" : stock <= reorderLevel ? "low" : "available";
  const stockLabel = stockState === "out" ? "Out of stock" : stockState === "low" ? "Low stock" : "In stock";

  return (
    <article className="product-card">
      <div className="product-card-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <Package size={42} strokeWidth={1.5} aria-hidden="true" />
        )}
        {product.category && <span className="product-card-category">{product.category}</span>}
      </div>

      <div className="product-card-content">
        <div className="product-card-title-row">
          <h3 title={product.name}>{product.name}</h3>
          {product.is_active === false && <span className="product-card-inactive">Inactive</span>}
        </div>
        <p className="product-card-sku">{product.sku || "No SKU assigned"}</p>

        <div className="product-card-details">
          <div>
            <span className="product-card-label">Selling price</span>
            <strong>{formatCurrency(product.price)}</strong>
          </div>
          <div className="product-card-stock">
            <span className="product-card-label">Available stock</span>
            <span className={`product-stock-badge ${stockState}`}>
              <span />
              {stock} {product.unit || "pcs"} · {stockLabel}
            </span>
          </div>
        </div>

        {canManageProducts && (
          <div className="product-card-actions">
            <button type="button" onClick={onEdit} className="product-edit-button">
              <Pencil size={15} /> Edit product
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="product-delete-button"
              aria-label={`Deactivate ${product.name}`}
              title={`Deactivate ${product.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
