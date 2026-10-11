/**
 * Payment component: cash records directly; UPI generates a QR (shown
 * inline as a base64 image) and opens Razorpay checkout for the customer
 * to scan-and-pay, matching the spec's Total -> Generate QR -> Customer
 * Pays -> Payment verified flow.
 */

import { useState } from "react";
import { createPaymentOrder, recordCashPayment, openRazorpayCheckout } from "../../services/payment";
import { useNotify } from "../common/Notification";
import { formatCurrency } from "../../utils/currency";
import PaymentItem from "./PaymentItem";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const METHODS = [
  { id: "cash", label: "CASH" },
  { id: "upi", label: "UPI" },
];

export default function Payment({ invoice, onPaymentComplete }) {
  const [method, setMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState(invoice?.total_amount || 0);
  const [qrImage, setQrImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const notify = useNotify();

  const handleSelectMethod = (id) => {
    setMethod(id);
    setQrImage(null);
  };

  const handleCashPayment = async () => {
    setProcessing(true);
    try {
      await recordCashPayment(invoice.id, cashAmount);
      notify("Cash payment recorded.", "success");
      onPaymentComplete?.();
    } catch (err) {
      notify(err.response?.data?.detail || "Payment failed.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateQr = async () => {
    setProcessing(true);
    try {
      const order = await createPaymentOrder(invoice.id, "razorpay");
      setQrImage(order.qr_image_base64);

      openRazorpayCheckout({
        orderId: order.order_id,
        amount: order.amount,
        currency: order.currency,
        invoiceId: invoice.id,
        keyId: RAZORPAY_KEY_ID,
        onSuccess: () => {
          notify("Payment verified.", "success");
          onPaymentComplete?.();
        },
        onFailure: (err) => notify(err.message || "Payment failed or cancelled.", "error"),
      });
    } catch (err) {
      notify(err.response?.data?.detail || "Could not generate QR.", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (!invoice) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Payment — {formatCurrency(invoice.total_amount)}
      </h3>

      <div className="flex gap-2 mb-4">
        {METHODS.map((m) => (
          <PaymentItem key={m.id} {...m} active={method === m.id} onSelect={handleSelectMethod} />
        ))}
      </div>

      {method === "cash" && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Amount received:</label>
          <input
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="w-full text-sm bg-slate-100 rounded-md px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#0B1E4A]/30"
          />
          {cashAmount > invoice.total_amount && (
            <p className="text-xs text-emerald-600 mb-2">
              Change due: {formatCurrency(cashAmount - invoice.total_amount)}
            </p>
          )}
          <button
            onClick={handleCashPayment}
            disabled={processing}
            className="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 hover:bg-emerald-700 transition-colors"
          >
            {processing ? "Processing…" : "Complete Payment"}
          </button>
        </div>
      )}

      {method === "upi" && (
        <div className="text-center">
          {!qrImage ? (
            <button
              onClick={handleGenerateQr}
              disabled={processing}
              className="w-full bg-[#0B1E4A] text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#132a63] transition-colors"
            >
              {processing ? "Generating…" : "Generate QR"}
            </button>
          ) : (
            <>
              <img src={`data:image/png;base64,${qrImage}`} alt="Payment QR" className="mx-auto w-40 h-40 rounded-lg border border-slate-200 mb-2" />
              <p className="text-xs text-slate-500">Scan with any UPI app to pay {formatCurrency(invoice.total_amount)}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}