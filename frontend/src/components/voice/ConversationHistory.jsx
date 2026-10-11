/**
 * Scrollable log of the session's commands and responses — useful for
 * the cashier to review what's happened so far in a long voice session,
 * and for debugging/training data review on the analytics side later.
 * Maintains its own local list since VoiceContext only tracks the
 * *current* turn, not full history (that lives server-side per InvoiceSession).
 */

import { useEffect, useRef, useState } from "react";
import { useVoiceContext } from "../../context/VoiceContext";

export default function ConversationHistory({ maxEntries = 20 }) {
  const { transcript, spokenResponse } = useVoiceContext();
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);
  const lastTranscriptRef = useRef(null);

  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      setHistory((prev) => [
        ...prev.slice(-(maxEntries - 1)),
        { id: Date.now(), transcript, response: spokenResponse, time: new Date() },
      ]);
    }
  }, [transcript, spokenResponse, maxEntries]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  if (history.length === 0) {
    return <p className="text-xs text-slate-400 italic">No commands yet this session.</p>;
  }

  return (
    <div ref={scrollRef} className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
      {history.map((entry) => (
        <div key={entry.id} className="text-xs bg-slate-50 rounded-lg px-2.5 py-2">
          <p className="text-slate-400 mb-0.5">
            {entry.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-slate-700 italic">"{entry.transcript}"</p>
          {entry.response && <p className="text-slate-500 mt-1">→ {entry.response}</p>}
        </div>
      ))}
    </div>
  );
}