/**
 * Product catalog service: CRUD for Products.jsx, and inventory lookups
 * for stock display.
 */

import api from "./api";

export async function listProducts({ search, category, activeOnly = true, limit = 50, offset = 0 } = {}) {
  const response = await api.get("/products", {
    params: { search, category, active_only: activeOnly, limit, offset },
  });
  return response.data;
}

export async function getProduct(productId) {
  const response = await api.get(`/products/${productId}`);
  return response.data;
}

export async function createProduct(payload) {
  const response = await api.post("/products", payload);
  return response.data;
}

export async function updateProduct(productId, payload) {
  const response = await api.patch(`/products/${productId}`, payload);
  return response.data;
}

export async function deactivateProduct(productId) {
  await api.delete(`/products/${productId}`);
}

export async function getInventory(productId) {
  const response = await api.get(`/inventory/${productId}`);
  return response.data;
}

export async function listInventory() {
  const response = await api.get("/inventory");
  return response.data;
}

export async function getLowStockAlerts() {
  const response = await api.get("/inventory/alerts/low-stock");
  return response.data;
}

export async function adjustStock(productId, movementType, quantity, reason) {
  const response = await api.post("/inventory/adjust", {
    product_id: productId,
    movement_type: movementType,
    quantity,
    reason,
  });
  return response.data;
}

export async function previewPdfRestock(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/inventory/restock/pdf/preview", formData, {
    headers: { "Content-Type": undefined },
    timeout: 120000,
  });
  return response.data;
}

export async function applyPdfRestock(items) {
  const response = await api.post("/inventory/restock/pdf/apply", { items });
  return response.data;
}