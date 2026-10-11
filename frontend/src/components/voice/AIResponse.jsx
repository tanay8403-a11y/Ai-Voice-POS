/**
 * Shows the assistant's spoken/text response and the disambiguation
 * prompt. Checkout confirmation delegates to the parent-provided handler
 * so the toast + onCheckoutComplete callback stay centralized in VoiceAssistant.
 */

import { useVoiceContext } from "../../context/VoiceContext";

export default function AIResponse({ onConfirmCheckout }) {
  const { spokenResponse, ambiguousItems, pickDisambiguation, requiresConfirmation, resetInvoiceSession } = useVoiceContext();

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">System Prompt</p>
      <div className="bg-white rounded-lg px-3 py-2.5 text-sm text-slate-700">
        {spokenResponse || "Ready. Tell me the products."}
      </div>

      {Object.entries(ambiguousItems || {}).map(([name, options]) => (
        <div key={name} className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">Which "{name}"?</p>
          <div className="flex flex-col gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.product_id}
                onClick={() => pickDisambiguation(name, opt.product_id, 1)}
                className="text-sm text-left bg-white hover:bg-amber-100 border border-amber-200 rounded-md px-2.5 py-1.5 transition-colors"
              >
                {opt.name} — ₹{opt.price.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      ))}

      {requiresConfirmation && (
        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-sm font-medium text-indigo-900 mb-2">Confirm checkout?</p>
          <div className="flex gap-2">
            <button onClick={onConfirmCheckout} className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-md hover:bg-indigo-700">
              Yes, checkout
            </button>
            <button onClick={resetInvoiceSession} className="flex-1 bg-white border border-indigo-200 text-indigo-600 text-xs font-semibold py-2 rounded-md hover:bg-indigo-50">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}