/**
 * Displays the most recent spoken command as a transcript bubble, plus
 * chips for each item the AI matched from that command (e.g. "DAIRY MILK (2)").
 */

import { useVoiceContext } from "../../context/VoiceContext";

export default function Transcript() {
  const { transcript, ambiguousItems, unresolvedItems } = useVoiceContext();

  if (!transcript) return null;

  const hasAmbiguous = Object.keys(ambiguousItems || {}).length > 0;

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">Last Command</p>
      <div className={`rounded-lg px-3 py-2.5 ${hasAmbiguous ? "bg-amber-50" : "bg-emerald-100"}`}>
        <p className={`text-sm italic mb-2 ${hasAmbiguous ? "text-amber-900" : "text-emerald-900"}`}>
          "{transcript}"
        </p>

        {unresolvedItems?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unresolvedItems.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 bg-white text-rose-500 text-xs font-medium px-2 py-0.5 rounded-full">
                ✕ {name.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}