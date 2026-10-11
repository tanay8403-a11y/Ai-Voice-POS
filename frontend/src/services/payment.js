/**
 * Payment service — matches the QR-first flow:
 * /payment/create (get QR or cash amount due) -> /payment/verify -> /payment/cash.
 */

import api from "./api";

export async function createPaymentOrder(invoiceId, method) {
  const response = await api.post("/payment/create", { invoice_id: invoiceId, method });
  return response.data;
  // cash: { method: "cash", amount, invoice_number }
  // razorpay: { order_id, amount, currency, qr_image_base64 }
}

export async function verifyRazorpayPayment(invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  const response = await api.post("/payment/verify", {
    invoice_id: invoiceId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return response.data;
}

export async function recordCashPayment(invoiceId, amount) {
  const response = await api.post("/payment/cash", { invoice_id: invoiceId, amount });
  return response.data;
}

export async function getPayments(invoiceId) {
  const response = await api.get(`/payment/${invoiceId}`);
  return response.data;
}

export async function refundPayment(paymentId, reason = null) {
  const response = await api.post("/payment/refund", { payment_id: paymentId, reason });
  return response.data;
}

/**
 * Opens Razorpay's checkout modal for the "card"/"upi" flow. Requires the
 * Razorpay script loaded globally (see index.html).
 */
export function openRazorpayCheckout({ orderId, amount, currency, invoiceId, keyId, onSuccess, onFailure }) {
  const options = {
    key: keyId,
    amount,
    currency,
    order_id: orderId,
    name: "Voice AI POS",
    handler: async (response) => {
      try {
        const result = await verifyRazorpayPayment(
          invoiceId, response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature
        );
        onSuccess?.(result);
      } catch (err) {
        onFailure?.(err);
      }
    },
    modal: { ondismiss: () => onFailure?.(new Error("Payment cancelled by user")) },
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
}