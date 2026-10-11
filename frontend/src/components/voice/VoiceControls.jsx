/**
 * Mic control buttons (Start/Stop Listening). Reads/drives state via
 * VoiceContext so it can be placed in the footer action bar independently
 * of the rest of the voice panel.
 */

import { Mic, MicOff } from "lucide-react";
import { useVoiceContext } from "../../context/VoiceContext";

export default function VoiceControls({ onCommandProcessed }) {
  const { isRecording, isProcessing, beginRecording, stopAndSend } = useVoiceContext();

  const handleStart = async () => {
    await beginRecording();
  };

  const handleStop = async () => {
    const result = await stopAndSend();
    if (result) onCommandProcessed?.(result);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleStart}
        disabled={isRecording || isProcessing}
        className="flex items-center gap-2 bg-[#0B1E4A] text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40 hover:bg-[#132a63] transition-colors"
      >
        <Mic size={16} /> Start Listening
      </button>
      <button
        onClick={handleStop}
        disabled={!isRecording}
        className="flex items-center gap-2 bg-rose-50 text-rose-600 text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-40 hover:bg-rose-100 transition-colors"
      >
        <MicOff size={16} /> Stop Listening
      </button>
    </div>
  );
}