/**
 * Small animated indicator showing the assistant's current state
 * (idle / listening / processing). Purely visual — reads state via props
 * so it can be reused in the header, sidebar, or a compact status chip.
 */

import { Wifi } from "lucide-react";

export default function ListeningIndicator({ isRecording, isProcessing }) {
  const label = isRecording ? "LISTENING..." : isProcessing ? "PROCESSING..." : "IDLE";
  const bgColor = isRecording ? "bg-emerald-500" : isProcessing ? "bg-amber-500" : "bg-slate-400";

  return (
    <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${bgColor}`}>
      <span className="flex items-center gap-2 text-white text-xs font-bold tracking-wide">
        <span className={`w-2 h-2 rounded-full bg-white ${isRecording || isProcessing ? "animate-pulse" : ""}`} />
        {label}
      </span>
      <Wifi size={16} className="text-white/90" />
    </div>
  );
}