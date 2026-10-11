/**
 * Voice session outcomes: completion rate, session counts by status,
 * average duration. Pulled live from /reports/voice-analytics, which
 * aggregates real InvoiceSession rows — no placeholder data.
 */

import { useEffect, useState } from "react";
import { getVoiceAnalytics } from "../../services/reports";
import { useNotify } from "../common/Notification";

export default function VoiceAnalytics({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getVoiceAnalytics(startDate, endDate)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => notify(err.response?.data?.detail || "Failed to load voice analytics.", "error"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate, notify]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">Loading voice analytics…</div>;
  }

  if (!data || data.total_sessions === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Voice Analytics</h3>
        <p className="text-sm text-slate-400">No voice sessions recorded yet for this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Voice Analytics</h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat label="Total Sessions" value={data.total_sessions} />
        <Stat label="Completion Rate" value={`${data.completion_rate}%`} />
        <Stat label="Completed" value={data.completed_sessions} tone="emerald" />
        <Stat label="Cancelled" value={data.cancelled_sessions} tone="slate" />
        <Stat label="Failed" value={data.failed_sessions} tone="rose" />
        <Stat
          label="Avg Duration"
          value={data.average_session_duration_seconds != null ? `${data.average_session_duration_seconds}s` : "—"}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "slate" }) {
  const toneClass = {
    emerald: "text-emerald-600",
    rose: "text-rose-600",
    slate: "text-slate-800",
  }[tone];

  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}