/**
 * Breakdown of which voice intents (add_item, checkout, apply_discount,
 * etc) occur most often — helps identify which commands cashiers rely
 * on, and which ones might need better recognition. Reads the same
 * /reports/voice-analytics payload as VoiceAnalytics, just renders the
 * intent_breakdown portion.
 */

import { useEffect, useState } from "react";
import { getVoiceAnalytics } from "../../services/reports";
import { useNotify } from "../common/Notification";

export default function CommandAnalytics({ startDate, endDate }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVoiceAnalytics(startDate, endDate)
      .then((result) => { if (!cancelled) setBreakdown(result.intent_breakdown); })
      .catch((err) => notify(err.response?.data?.detail || "Failed to load command analytics.", "error"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate, notify]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">Loading command breakdown…</div>;
  }

  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Command Breakdown</h3>
        <p className="text-sm text-slate-400">No command data recorded yet for this period.</p>
      </div>
    );
  }

  const maxCount = Math.max(...breakdown.map((b) => b.count));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Command Breakdown</h3>
      <div className="space-y-2.5">
        {breakdown.map((entry) => (
          <div key={entry.intent}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-slate-700">{entry.intent.replace(/_/g, " ")}</span>
              <span className="text-slate-500">{entry.count}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0B1E4A] rounded-full"
                style={{ width: `${(entry.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}