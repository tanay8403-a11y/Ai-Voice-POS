import {
  Settings,
  HelpCircle,
  MapPin,
  Wifi,
} from "lucide-react";

export default function BillingHeader({
  user,
  locationLabel,
  connectivity,
}) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">

      <div className="flex items-center justify-between px-8 py-4">

        {/* Left */}

        <div className="flex items-center gap-10">

          <div>

            <h1 className="text-3xl font-bold text-[#1E3A8A]">
              Voice AI POS
            </h1>

            <p className="text-sm text-slate-500">
              AI Powered Billing
            </p>

          </div>

        </div>

        {/* Center */}

        <div className="hidden lg:flex items-center gap-4">

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">

            <MapPin
              size={18}
              className="text-blue-700"
            />

            <span className="text-sm">
              {locationLabel}
            </span>

          </div>

          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm ${
              connectivity.online
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >

            <Wifi size={18} />

            {connectivity.label}

          </div>

        </div>

        {/* Right */}

        <div className="flex items-center gap-6">

          <button className="text-slate-500 hover:text-blue-700">

            <Settings size={20} />

          </button>

          <button className="text-slate-500 hover:text-blue-700">

            <HelpCircle size={20} />

          </button>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">

            <div className="h-10 w-10 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white font-bold">

              {user?.name?.charAt(0)?.toUpperCase() || "U"}

            </div>

            <div>

              <p className="font-semibold text-slate-800">
                {user?.name || "Cashier"}
              </p>

              <p className="text-xs text-slate-500 capitalize">
                {user?.role}
              </p>

            </div>

          </div>

        </div>

      </div>

    </header>
  );
}