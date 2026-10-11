import { useEffect, useState } from "react";
import { Building2, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { getMyStore } from "../services/authServices";
import { isAdmin } from "../utils/permissions";

export default function Settings() {
  const { user } = useAuthContext();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(isAdmin(user?.role));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin(user?.role)) return undefined;

    let active = true;
    getMyStore()
      .then((data) => {
        if (active) setStore(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.detail ||
              "Could not load your store details."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.role]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your account and store configuration.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a]">
            <UserRound size={20} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">Account</h2>
            <p className="text-sm text-slate-500">Your signed-in account information</p>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <SettingValue label="Name" value={user?.name} />
          <SettingValue label="Email" value={user?.email} />
          <SettingValue label="Phone" value={user?.phone} />
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium capitalize text-slate-800">
              <ShieldCheck size={15} className="text-emerald-700" />
              {user?.role || "—"}
            </dd>
          </div>
        </dl>
      </section>

      {isAdmin(user?.role) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Store</h2>
              <p className="text-sm text-slate-500">Your store profile and location</p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
              <LoaderCircle size={16} className="animate-spin" /> Loading store details…
            </div>
          )}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {store && (
            <dl className="grid gap-4 sm:grid-cols-2">
              <SettingValue label="Store name" value={store.store_name} />
              <SettingValue label="Business type" value={store.business_type} />
              <SettingValue label="Store phone" value={store.phone} />
              <SettingValue label="Store email" value={store.email} />
              <SettingValue label="Address" value={[store.address, store.city, store.state, store.pincode].filter(Boolean).join(", ")} />
              <SettingValue label="Store code" value={store.store_code} />
            </dl>
          )}
        </section>
      )}
    </div>
  );
}

function SettingValue({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}
