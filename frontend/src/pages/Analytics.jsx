/** Voice AI analytics page — real metrics remain in the existing analytics components. */

import { useState } from "react";
import { AudioLines, CalendarDays, Activity } from "lucide-react";
import VoiceAnalyticsCard from "../components/analytics/VoiceAnalytics";
import CommandAnalytics from "../components/analytics/CommandAnalytics";

export default function VoiceAnalyticsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1e4a] via-[#1e3a8a] to-[#254a9b] px-5 py-6 text-white shadow-sm sm:px-7 lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[26px] border-white/10" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <AudioLines size={14} /> Voice operations
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Voice Analytics</h1>
            <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">Review command activity and voice assistant performance from recorded POS analytics.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-semibold text-blue-50"><Activity size={16} className="text-emerald-200" /> Voice performance</span>
        </div>
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-1 flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:w-auto sm:mr-2"><CalendarDays size={15} className="text-[#1e3a8a]" /> Date range</div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="rounded-lg border border-slate-200 bg-[#f8f9fb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/15" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="rounded-lg border border-slate-200 bg-[#f8f9fb] px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/15" />
        </label>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <VoiceAnalyticsCard startDate={startDate || undefined} endDate={endDate || undefined} />
        <CommandAnalytics startDate={startDate || undefined} endDate={endDate || undefined} />
      </div>
    </div>
  );
}
