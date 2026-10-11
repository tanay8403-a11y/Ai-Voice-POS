import { useState } from "react";

import ProductHeader from "../components/inventory/ProductHeader";
import ProductStats from "../components/inventory/ProductStats";
import ProductForm from "../components/inventory/ProductForm";
import ProductGrid from "../components/inventory/ProductGrid";

import { useProducts } from "../hooks/useProducts";
import {
  createProduct,
  updateProduct,
  deactivateProduct,
} from "../services/products";

import { useNotify } from "../components/common/Notification";
import { useAuthContext } from "../context/AuthContext";
import { isManagerOrAdmin } from "../utils/permissions";
import "./Products.css";

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  brand: "",
  unit: "pcs",
  price: 0,
  cost_price: 0,
  tax_percent: 0,
  initial_stock: 0,
  reorder_level: 10,
};

export default function Products() {
  const { products, loading, refetch } = useProducts();
  const { user } = useAuthContext();
  const canManageProducts = isManagerOrAdmin(user?.role);
  const notify = useNotify();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();
    return !query || [product.name, product.sku, product.category, product.brand]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  const openCreate = () => {
    setSelected(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setSelected(product);
    setForm({
      ...emptyForm,
      ...product,
    });
    setShowForm(true);
  };

  async function saveProduct(data) {
    try {
      if (selected) {
        await updateProduct(selected.id, data);
        notify("Product updated.", "success");
      } else {
        await createProduct(data);
        notify("Product created.", "success");
      }

      setShowForm(false);
      refetch();

    } catch (err) {
      notify(
        err.response?.data?.detail || "Save failed.",
        "error"
      );
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(`Deactivate ${product.name}?`)) return;
    try {
      await deactivateProduct(product.id);
      notify("Product deactivated.", "success");
      setShowForm(false);
      refetch();
    } catch (err) {
      notify(err.response?.data?.detail || "Could not deactivate product.", "error");
    }
  }

  return (
    <div className="products-page">
      <ProductHeader
        search={search}
        setSearch={setSearch}
        onAddProduct={openCreate}
        canManageProducts={canManageProducts}
      />

      <ProductStats products={products} />

      <section className="products-catalog" aria-label="Product catalog">
        <div className="products-catalog-heading">
          <div>
            <h2>Product catalog</h2>
            <p>{loading ? "Loading products…" : `${filteredProducts.length} of ${products.length} products`}</p>
          </div>
          <span className="products-catalog-count">{filteredProducts.length} items</span>
        </div>
        {loading ? (
          <div className="products-empty-state" role="status">Loading products…</div>
        ) : filteredProducts.length ? (
          <ProductGrid
            products={filteredProducts}
            onEdit={openEdit}
            onDelete={removeProduct}
            canManageProducts={canManageProducts}
          />
        ) : (
          <div className="products-empty-state">
            {products.length
              ? "No products match your search."
              : canManageProducts
                ? "Your catalog is empty. Add a product to get started."
                : "There are no products available in the catalog yet."}
          </div>
        )}
      </section>

      {canManageProducts && showForm && (
        <ProductForm
          show={showForm}
          form={form}
          setForm={setForm}
          selected={selected}
          onSubmit={(event) => {
            event.preventDefault();
            saveProduct(form);
          }}
          onDeactivate={() => removeProduct(selected)}
          onClose={() => setShowForm(false)}
        />
      )}

    </div>
  );
}