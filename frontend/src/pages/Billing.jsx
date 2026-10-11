import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Mic,
  MicOff,
  Minus,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { VoiceProvider, useVoiceContext } from "../context/VoiceContext";
import { useAuthContext } from "../context/AuthContext";
import { useCart } from "../hooks/useCart";
import { useNotify } from "../components/common/Notification";
import { getInvoice } from "../services/billing";
import { formatCurrency } from "../utils/currency";
import Payment from "../components/billing/Payment";
import Invoice from "../components/billing/Invoice";

function BillingInner() {
  const { user } = useAuthContext();
  const cart = useCart();
  const voice = useVoiceContext();
  const notify = useNotify();
  const [stage, setStage] = useState("cart");
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [manualCommand, setManualCommand] = useState("");

  useEffect(() => {
    if (voice.invoiceSnapshot?.id) {
      cart.syncFromInvoice(voice.invoiceSnapshot);
    }
  }, [voice.invoiceSnapshot, cart.syncFromInvoice]);

  useEffect(() => {
    if (!voice.invoiceId) return undefined;

    let isCurrentRequest = true;
    getInvoice(voice.invoiceId)
      .then((updatedInvoice) => {
        if (isCurrentRequest) cart.syncFromInvoice(updatedInvoice);
      })
      .catch((err) => {
        if (isCurrentRequest) {
          notify(
            err.response?.data?.detail || "Could not refresh the voice bill.",
            "error"
          );
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [voice.invoiceId, voice.invoiceRevision, cart.syncFromInvoice, notify]);

  useEffect(() => {
    if (voice.error) {
      notify(voice.error, "error");
    }
  }, [voice.error, notify]);

  const displayItems = useMemo(
    () =>
      cart.items.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        return {
          ...item,
          displayName: item.product_name || `Product #${item.product_id}`,
          quantity,
          unitPrice,
          lineTotal: Number(item.line_total) || quantity * unitPrice,
        };
      }),
    [cart.items]
  );

  const subtotal = Number(cart.totals.subtotal) || 0;
  const tax = Number(cart.totals.tax) || 0;
  const total = Number(cart.totals.total) || 0;
  const assistantStatus = voice.isProcessing
    ? "Processing"
    : voice.isSpeaking
      ? "Speaking"
    : voice.isRecording
      ? voice.isAwake
        ? "Listening for commands"
        : "Listening for wake phrase"
      : "Microphone off";

  const handleMicToggle = async () => {
    if (voice.isRecording) {
      await voice.stopAndSend();
      return;
    }
    await voice.beginRecording();
  };

  const handleManualCommand = async (event) => {
    event.preventDefault();
    const command = manualCommand.trim();
    if (!command || voice.isProcessing) return;

    const result = await voice.sendTextCommand(command);
    if (result) setManualCommand("");
  };

  const handleVoiceCheckout = async () => {
    try {
      const result = await voice.confirmCheckout();
      if (!result?.invoice_id) {
        throw new Error("The voice checkout did not return an invoice.");
      }
      const invoice = await getInvoice(result.invoice_id);
      setActiveInvoice(invoice);
      setStage("receipt");
      notify("Checkout complete!", "success");
    } catch (err) {
      notify(err.response?.data?.detail || err.message || "Checkout failed.", "error");
    }
  };

  const handleManualCheckout = () => {
    if (!cart.invoice || cart.isEmpty) return;
    setActiveInvoice(cart.invoice);
    setStage("payment");
  };

  const handlePaymentComplete = async () => {
    if (!activeInvoice) return;
    const updated = await getInvoice(activeInvoice.id);
    setActiveInvoice(updated);
    setStage("receipt");
  };

  const handleCancelBill = async () => {
    await cart.clearCart();
    await voice.resetInvoiceSession();
    setActiveInvoice(null);
    setStage("cart");
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-[1720px] min-w-0 gap-4 sm:gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(360px,0.95fr)]">
      <section
        aria-labelledby="assistant-heading"
        className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[560px] sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 id="assistant-heading" className="text-lg font-semibold text-slate-900">
              Live voice assistant
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Speak naturally to add items or manage this bill.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase ${
              voice.isRecording ? "text-emerald-700" : "text-slate-500"
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                voice.isRecording
                  ? "animate-pulse bg-emerald-500"
                  : voice.isProcessing
                    ? "bg-amber-500"
                    : "bg-slate-300"
              }`}
            />
            {assistantStatus}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <button
            type="button"
            onClick={handleMicToggle}
            aria-label={
              voice.isRecording ? "Stop live listening" : "Start live listening"
            }
            aria-pressed={voice.isRecording}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 disabled:cursor-wait disabled:opacity-70 ${
              voice.isRecording
                ? "voice-mic-listening bg-rose-600 shadow-rose-900/20"
                : "bg-[#1e3a8a] shadow-blue-950/20"
            }`}
          >
            {voice.isRecording && (
              <span aria-hidden="true" className="voice-mic-wave">
                <span />
                <span />
                <span />
              </span>
            )}
            {voice.isProcessing ? (
              <Loader2 size={34} className="animate-spin" />
            ) : voice.isRecording ? (
              <Mic size={34} className="voice-mic-icon" />
            ) : (
              <MicOff size={34} />
            )}
          </button>
          <p className="mt-4 text-sm font-medium text-slate-600">
            {voice.isProcessing
              ? voice.isRecording
                ? "Listening continuously while processing..."
                : "Processing your command..."
              : voice.isRecording
                ? voice.isAwake
                  ? "Speak a billing or inventory command — it will be detected automatically."
                  : 'Say “Start Billing” to activate the assistant.'
                : "Tap the microphone to enable live listening."}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 px-5 py-4 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Last command detected
          </p>
          <p className="mt-2 min-h-6 text-sm leading-6 text-slate-800">
            {voice.transcript || "Your voice command will appear here."}
          </p>
        </div>

        <div
          className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3"
          role="log"
          aria-label="Voice assistant conversation"
          aria-live="polite"
        >
          {voice.messages.length > 0 ? (
            voice.messages.map((message, index) => (
              <p
                key={`${index}-${message.role}`}
                className={`w-fit max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-blue-100 text-blue-950"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {message.content}
              </p>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              Start by saying “Start Billing” or type a command below.
            </p>
          )}
        </div>

        {voice.matchedItems.length > 0 && (
          <div
            className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
            aria-live="polite"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Best inventory match added to cart
            </p>
            <ul className="mt-2 space-y-2">
              {voice.matchedItems.map((item) => (
                <li
                  key={`${item.product_name}-${item.recognized_name}`}
                  className="flex items-start justify-between gap-3 text-sm text-emerald-950"
                >
                  <span>
                    <span className="font-semibold">{item.product_name}</span>
                    {item.recognized_name?.toLowerCase() !== item.product_name?.toLowerCase() && (
                      <span className="block text-xs text-emerald-800">
                        Heard “{item.recognized_name}” · match {Math.round(item.match_score * 100)}%
                      </span>
                    )}
                    <span className="block text-xs text-emerald-800">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </span>
                  </span>
                  <span className="font-semibold">{formatCurrency(item.line_total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.entries(voice.ambiguousItems).map(([spokenName, candidates]) => (
          <div
            key={spokenName}
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
          >
            <p className="text-sm font-semibold text-amber-950">
              Choose the best product match for “{spokenName}”:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <button
                  key={candidate.product_id}
                  type="button"
                  disabled={voice.isProcessing}
                  onClick={() =>
                    voice.pickDisambiguation(
                      spokenName,
                      candidate.product_id,
                      candidate.quantity || 1
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-sm text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                >
                  <span className="block font-semibold">{candidate.name}</span>
                  <span className="block text-xs">
                    {candidate.quantity || 1} × {formatCurrency(candidate.price)}
                    {candidate.match_score != null &&
                      ` · ${Math.round(candidate.match_score * 100)}% match`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <form onSubmit={handleManualCommand} className="mt-3 flex gap-2">
          <label htmlFor="manual-voice-command" className="sr-only">
            Type a billing command
          </label>
          <input
            id="manual-voice-command"
            type="text"
            value={manualCommand}
            onChange={(event) => setManualCommand(event.target.value)}
            placeholder="Type a billing command"
            maxLength={500}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            disabled={!manualCommand.trim() || voice.isProcessing}
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {voice.isRecording && !voice.isAwake && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Wake phrase: “Start Billing”.
          </p>
        )}

        {voice.spokenResponse && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-blue-700" />
            <p>{voice.spokenResponse}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-slate-500">
            Cashier: {user?.name || user?.username || "Staff"}
          </span>
          <button
            type="button"
            onClick={handleCancelBill}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-rose-700"
          >
            <Trash2 size={15} />
            Clear bill
          </button>
        </div>

        {voice.requiresConfirmation && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Confirm checkout with the voice assistant?
            </p>
            <button
              type="button"
              onClick={handleVoiceCheckout}
              className="shrink-0 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
            >
              Confirm
            </button>
          </div>
        )}
      </section>

      <section
        aria-labelledby="cart-heading"
        className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[560px] sm:p-6"
      >
        {stage === "cart" && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 id="cart-heading" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <ShoppingCart size={19} className="text-[#1e3a8a]" />
                Current cart
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {cart.items.length} {cart.items.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-3">
              {cart.isEmpty ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                  <ShoppingCart size={34} className="text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">Your cart is empty</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    Use the voice assistant to add items to this bill.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {displayItems.map((item) => (
                    <li
                      key={item.product_id}
                      className="flex items-center justify-between gap-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold uppercase text-[#1e3a8a]">
                          {item.displayName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {item.displayName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">Qty: {item.quantity}</p>
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.displayName} quantity`}
                              onClick={() =>
                                cart.updateQuantity(
                                  item.product_id,
                                  Math.max(0, item.quantity - 1)
                                )
                              }
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Increase ${item.displayName} quantity`}
                              onClick={() =>
                                cart.updateQuantity(item.product_id, item.quantity + 1)
                              }
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${item.displayName}`}
                              onClick={() => cart.removeItem(item.product_id)}
                              className="ml-1 rounded p-1 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                        {formatCurrency(item.lineTotal)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
                  <span>Total</span>
                  <span className="text-[#1e3a8a]">{formatCurrency(total)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualCheckout}
                disabled={cart.isEmpty}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-3 text-sm font-semibold uppercase text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CreditCard size={16} />
                Checkout
              </button>
            </div>
          </>
        )}

        {stage === "payment" && activeInvoice && (
          <>
            <div className="border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <CreditCard size={19} className="text-[#1e3a8a]" />
                Complete payment
              </h2>
            </div>
            <div className="flex-1 py-4">
              <Payment invoice={activeInvoice} onPaymentComplete={handlePaymentComplete} />
            </div>
            <button
              type="button"
              onClick={() => setStage("cart")}
              className="self-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Back to cart
            </button>
          </>
        )}

        {stage === "receipt" && activeInvoice && (
          <>
            <div className="border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Receipt size={19} className="text-[#1e3a8a]" />
                Receipt
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <Invoice invoice={activeInvoice} />
            </div>
            <button
              type="button"
              onClick={handleCancelBill}
              className="w-full rounded-lg bg-[#1e3a8a] px-4 py-3 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Start new bill
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default function Billing() {
  const language = localStorage.getItem("app_language") === "hi" ? "hi" : "en";

  return (
    <VoiceProvider language={language}>
      <BillingInner />
    </VoiceProvider>
  );
}
