import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onEdit, onDelete, canManageProducts }) {
  return (
    <div className="products-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          canManageProducts={canManageProducts}
          onEdit={canManageProducts ? () => onEdit(product) : undefined}
          onDelete={canManageProducts ? () => onDelete(product) : undefined}
        />
      ))}
    </div>
  );
}