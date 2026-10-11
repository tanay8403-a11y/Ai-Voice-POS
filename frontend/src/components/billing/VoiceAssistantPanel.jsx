import {
  Mic,
  MicOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
} from "lucide-react";

export default function VoiceAssistantPanel({
  voice,
  cart,
  onMicToggle,
  onConfirmCheckout,
}) {
  const status = voice.isRecording
    ? "Listening..."
    : voice.isProcessing
    ? "Processing..."
    : "Ready";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}

      <div className="border-b border-slate-100 px-6 py-5 flex items-center justify-between">

        <div>

          <h2 className="text-lg font-bold text-slate-800">
            Voice Assistant
          </h2>

          <p className="text-sm text-slate-500">
            AI Billing Assistant
          </p>

        </div>

        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Bot className="text-[#0B1E4A]" size={24} />
        </div>

      </div>

      {/* Status */}

      <div className="p-6 space-y-5">

        <div className="flex items-center justify-between">

          <span className="text-sm font-medium text-slate-500">
            Status
          </span>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              voice.isRecording
                ? "bg-green-100 text-green-700"
                : voice.isProcessing
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {status}
          </span>

        </div>

        {/* AI Response */}

        <div>

          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assistant Response
          </label>

          <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-4 min-h-[110px]">

            <p className="text-slate-700 leading-relaxed">

              {voice.spokenResponse ||
                "Say 'Start Billing' to begin, or 'Add to Inventory' to restock a catalog product."}

            </p>

          </div>

        </div>

        {/* Transcript */}

        {voice.transcript && (

          <div>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">

              Last Command

            </label>

            <div className="mt-2 rounded-xl border border-green-200 bg-green-50 p-4">

              <div className="flex items-start gap-2">

                <CheckCircle2
                  className="text-green-600 mt-0.5"
                  size={18}
                />

                <div>

                  <p className="font-semibold text-slate-800">

                    "{voice.transcript}"

                  </p>

                  <p className="text-sm text-slate-500 mt-1">

                    {cart.items.length} item(s) currently in cart

                  </p>

                </div>

              </div>

            </div>

          </div>

        )}

        {/* Voice Button */}

        <button
          onClick={onMicToggle}
          disabled={voice.isProcessing}
          className={`w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition ${
            voice.isRecording
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-[#0B1E4A] text-white hover:bg-blue-900"
          }`}
        >
          {voice.isProcessing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : voice.isRecording ? (
            <Mic size={18} />
          ) : (
            <MicOff size={18} />
          )}

          {voice.isProcessing
            ? "Processing..."
            : voice.isRecording
            ? "Stop Recording"
            : "Start Recording"}
        </button>

        {/* Checkout Confirmation */}

        {voice.requiresConfirmation && (

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">

            <div className="flex items-start gap-2">

              <AlertCircle
                className="text-indigo-600 mt-0.5"
                size={18}
              />

              <div className="flex-1">

                <p className="font-semibold text-indigo-900">

                  Confirm checkout?

                </p>

                <p className="text-sm text-indigo-700 mt-1">

                  Voice assistant is waiting for confirmation.

                </p>

              </div>

            </div>

            <button
              onClick={onConfirmCheckout}
              className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-white font-semibold hover:bg-indigo-700"
            >
              Confirm Checkout
            </button>

          </div>

        )}

      </div>

    </div>
  );
}