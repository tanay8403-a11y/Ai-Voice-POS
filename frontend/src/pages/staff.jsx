/**
 * Staff management page using the project's real staff table and creation modal.
 * The supplied static staff names, shifts, and terminal counts are not hardcoded.
 */

import { useState } from "react";
import { ArrowUpRight, ShieldCheck, Users, UserPlus } from "lucide-react";
import CashierTable from "../components/owner/CashierTable";
import AddStaffModal from "../components/owner/AddStaffModal";

export default function Staff() {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1e4a] via-[#1e3a8a] to-[#254a9b] px-5 py-6 text-white shadow-sm sm:px-7 lg:px-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[26px] border-white/10" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <Users size={14} /> Team & access
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Staff Management</h1>
            <p className="mt-2 text-sm leading-6 text-blue-100 sm:text-base">
              Add team members, manage account status, and assign access using your existing POS staff controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#1e3a8a] shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <UserPlus size={17} /> Add Staff Member <ArrowUpRight size={15} />
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a]"><Users size={21} /></span>
          <div>
            <p className="font-semibold text-slate-900">Staff accounts</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">The table below loads the actual staff accounts from your backend.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={21} /></span>
          <div>
            <p className="font-semibold text-slate-900">Role-based access</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">Use the existing account and permission actions to control staff access.</p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Team directory</h2>
            <p className="mt-1 text-sm text-slate-500">Manage, activate, or change roles for your team.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Live staff data</span>
        </div>
        <CashierTable key={refreshKey} />
      </section>

      <AddStaffModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
