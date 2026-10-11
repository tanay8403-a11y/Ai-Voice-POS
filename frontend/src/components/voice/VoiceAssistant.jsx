/**
 * Composes the voice panel from its sub-components, and owns the
 * side-effects that don't belong inside any single sub-component:
 * toast notifications for errors/unresolved items, and notifying the
 * parent page when the invoice changes or checkout completes.
 */

import { useEffect } from "react";
import { useVoiceContext } from "../../context/VoiceContext";
import { useNotify } from "../common/Notification";
import VoiceStatus from "./VoiceStatus";
import AIResponse from "./AIResponse";
import Transcript from "./Transcript";
import VoiceControls from "./VoiceControls";
import ConversationHistory from "./ConversationHistory";

export default function VoiceAssistant({ onInvoiceChanged, onCheckoutComplete, showHistory = false }) {
  const { invoiceId, cartTotal, error, unresolvedItems, confirmCheckout } = useVoiceContext();
  const notify = useNotify();

  useEffect(() => {
    if (invoiceId) onInvoiceChanged?.(invoiceId);
  }, [invoiceId, cartTotal, onInvoiceChanged]);

  useEffect(() => {
    if (error) notify(error, "error");
  }, [error, notify]);

  useEffect(() => {
    if (unresolvedItems?.length > 0) {
      notify(`Couldn't find: ${unresolvedItems.join(", ")}`, "warning");
    }
  }, [unresolvedItems, notify]);

  // Wraps the context's confirmCheckout so a success toast + parent
  // callback fire here, rather than duplicating this logic inside AIResponse.
  const handleConfirmCheckout = async () => {
    try {
      const result = await confirmCheckout();
      notify("Checkout complete!", "success");
      onCheckoutComplete?.(result.invoice_id);
    } catch {
      // error already surfaced via the context's error state -> toast above
    }
  };

  return (
    <div className="bg-slate-100 rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
      <VoiceStatus />
      <AIResponse onConfirmCheckout={handleConfirmCheckout} />
      <Transcript />
      {cartTotal > 0 && (
        <p className="text-sm font-semibold text-slate-600">Cart total: ₹{cartTotal.toFixed(2)}</p>
      )}
      {showHistory && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-500 mb-2">History</p>
          <ConversationHistory />
        </div>
      )}
      <VoiceControls />
    </div>
  );
}