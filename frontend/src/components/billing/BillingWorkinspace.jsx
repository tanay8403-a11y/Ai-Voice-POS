import Cart from "./Cart";
import Payment from "./Payment";
import Invoice from "./Invoice";

export default function BillingWorkspace({
  stage,
  cart,
  activeInvoice,
  onUpdateQuantity,
  onRemoveItem,
  onApplyDiscount,
  onCheckout,
  onPaymentComplete,
}) {
  return (
    <div className="flex-1">

      {/* Cart */}

      {stage === "cart" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100">

            <h2 className="text-xl font-bold text-slate-800">
              Current Bill
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Voice AI updates this cart in real time.
            </p>

          </div>

          <div className="p-6">

            <Cart
              items={cart.items}
              totals={cart.totals}
              isEmpty={cart.isEmpty}
              onUpdateQuantity={onUpdateQuantity}
              onRemoveItem={onRemoveItem}
              onApplyDiscount={onApplyDiscount}
              onCheckout={onCheckout}
            />

          </div>

        </div>
      )}

      {/* Payment */}

      {stage === "payment" && activeInvoice && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100">

            <h2 className="text-xl font-bold text-slate-800">
              Payment
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Select payment method and complete transaction.
            </p>

          </div>

          <div className="p-6">

            <Payment
              invoice={activeInvoice}
              onPaymentComplete={onPaymentComplete}
            />

          </div>

        </div>
      )}

      {/* Receipt */}

      {stage === "receipt" && activeInvoice && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-100">

            <h2 className="text-xl font-bold text-slate-800">
              Invoice
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Transaction completed successfully.
            </p>

          </div>

          <div className="p-6">

            <Invoice
              invoice={activeInvoice}
            />

          </div>

        </div>
      )}

    </div>
  );
}