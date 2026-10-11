/**
 * Reads voice state from VoiceContext and renders the listening indicator
 * plus any error banner. Kept separate from VoiceControls so status can
 * be shown in places (e.g. the header) that don't need mic buttons.
 */

import { useVoiceContext } from "../../context/VoiceContext";
import ListeningIndicator from "./ListeningIndicator";

export default function VoiceStatus() {
  const { isRecording, isProcessing, error } = useVoiceContext();

  return (
    <div>
      <ListeningIndicator isRecording={isRecording} isProcessing={isProcessing} />
      {error && (
        <div className="mt-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}