/**
 * Cart hook wired to the incremental billing API. An invoice is created
 * (DRAFT) the moment the first item is added, and every mutation calls
 * the backend directly rather than accumulating local-only state — this
 * keeps the manual cashier flow and the voice-driven flow both working
 * off the same server-side invoice.
 */

import { useState, useCallback } from "react";
import {
  startBilling, addItem as addItemApi, removeItem as removeItemApi,
  updateQuantity as updateQuantityApi, applyDiscount as applyDiscountApi,
  completeBilling, cancelSale as cancelSaleApi,
} from "../services/billing";

export function useCart() {
  const [invoice, setInvoice] = useState(null); // full InvoiceResponse from backend
  const [customerId, setCustomerId] = useState(null);

  const ensureInvoice = useCallback(async () => {
    if (invoice) return invoice;
    const newInvoice = await startBilling(customerId);
    setInvoice(newInvoice);
    return newInvoice;
  }, [invoice, customerId]);

  const addItem = useCallback(async (product, quantity = 1) => {
    const current = await ensureInvoice();
    const updated = await addItemApi(current.id, product.id, quantity);
    setInvoice(updated);
  }, [ensureInvoice]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (!invoice) return;
    if (quantity <= 0) {
      const updated = await removeItemApi(invoice.id, productId);
      setInvoice(updated);
      return;
    }
    const updated = await updateQuantityApi(invoice.id, productId, quantity);
    setInvoice(updated);
  }, [invoice]);

  const removeItem = useCallback(async (productId) => {
    if (!invoice) return;
    const updated = await removeItemApi(invoice.id, productId);
    setInvoice(updated);
  }, [invoice]);

  const applyItemDiscount = useCallback(async (productId, discount) => {
    if (!invoice) return;
    // discount is a flat amount here; backend also supports "percent"
    const updated = await applyDiscountApi(invoice.id, "flat", discount, productId);
    setInvoice(updated);
  }, [invoice]);

  const applyCartDiscount = useCallback(async (discountType, value) => {
    if (!invoice) return;
    const updated = await applyDiscountApi(invoice.id, discountType, value, null);
    setInvoice(updated);
  }, [invoice]);

  const clearCart = useCallback(async () => {
    if (invoice) {
      await cancelSaleApi(invoice.id).catch(() => {});
    }
    setInvoice(null);
    setCustomerId(null);
  }, [invoice]);

  /** Merges the voice session's linked invoice into this cart view (same invoice, re-fetched). */
  const syncFromInvoice = useCallback((backendInvoice) => {
    setInvoice(backendInvoice);
  }, []);

  const checkout = useCallback(async (paymentMethod = null) => {
    if (!invoice || invoice.items.length === 0) throw new Error("Cart is empty");
    const completed = await completeBilling(invoice.id, paymentMethod);
    setInvoice(completed);
    return completed;
  }, [invoice]);


const customer =
    invoice?.customer ?? {
        name: "Walk-in Customer",
        phone: "",
        email: "",
        points: 0,
    };

    
  return {
    invoice,
    items: invoice?.items || [],
    totals: invoice
      ? { subtotal: invoice.subtotal, discount: invoice.discount_amount, tax: invoice.tax_amount, total: invoice.total_amount }
      : { subtotal: 0, discount: 0, tax: 0, total: 0 },
    customerId,
    setCustomerId,
    addItem,
    updateQuantity,
    removeItem,
    applyItemDiscount,
    applyCartDiscount,
    clearCart,
    syncFromInvoice,
    checkout,
    isEmpty: !invoice || invoice.items.length === 0,
  };
}