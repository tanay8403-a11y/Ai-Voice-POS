/**
 * Billing service — matches the incremental billing API:
 * start -> add-item -> remove-item -> update-qty -> apply-discount -> complete.
 */

import api from "./api";

export async function startBilling(customerId = null) {
  const response = await api.post("/billing/start", { customer_id: customerId });
  return response.data; // full InvoiceResponse (empty cart)
}

export async function addItem(invoiceId, productId, quantity = 1) {
  const response = await api.post("/billing/add-item", {
    invoice_id: invoiceId, product_id: productId, quantity,
  });
  return response.data;
}

export async function removeItem(invoiceId, productId) {
  const response = await api.post("/billing/remove-item", {
    invoice_id: invoiceId, product_id: productId,
  });
  return response.data;
}

export async function removeLastItem(invoiceId) {
  const response = await api.post(`/billing/remove-last-item/${invoiceId}`);
  return response.data;
}

export async function updateQuantity(invoiceId, productId, quantity) {
  const response = await api.post("/billing/update-qty", {
    invoice_id: invoiceId, product_id: productId, quantity,
  });
  return response.data;
}

export async function applyDiscount(invoiceId, discountType, value, targetProductId = null) {
  const response = await api.post("/billing/apply-discount", {
    invoice_id: invoiceId, discount_type: discountType, value, target_product_id: targetProductId,
  });
  return response.data;
}

export async function completeBilling(invoiceId, paymentMethod = null) {
  const response = await api.post("/billing/complete", {
    invoice_id: invoiceId, payment_method: paymentMethod,
  });
  return response.data;
}

export async function cancelSale(invoiceId) {
  const response = await api.post(`/billing/cancel/${invoiceId}`);
  return response.data;
}

export async function getInvoice(invoiceId) {
  const response = await api.get(`/billing/${invoiceId}`);
  return response.data;
}

export async function getDashboardStats() {
  const response = await api.get("/billing/dashboard");
  return response.data;
}

export async function getRecentInvoices({ limit = 10, offset = 0, status, search } = {}) {
  const response = await api.get("/billing/recent", {
    params: { limit, offset, status: status || undefined, search: search || undefined },
  });
  return response.data;
}


export async function downloadInvoicePdf(invoiceId) {
  const response = await api.get(
    `/billing/${invoiceId}/pdf`,
    {
      responseType: "blob",
    }
  );

  const file = new Blob([response.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(file);

  const link = document.createElement("a");
  link.href = url;
  link.download = `invoice-${invoiceId}.pdf`;

  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}