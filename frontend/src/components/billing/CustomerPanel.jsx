import {
  User,
  Phone,
  Mail,
  Star,
  UserPlus,
  Search,
} from "lucide-react";

export default function CustomerPanel({
   customer = {
        name: "Walk-in Customer",
        phone: "",
        email: "",
        points: 0,
    },
  onSearchCustomer,
  onAddCustomer,
  onPhoneChange,
}) {
  return (
    <div className="space-y-5">

      {/* Customer Card */}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Customer
            </h2>

            <p className="text-sm text-slate-500">
              Search or add a customer
            </p>
          </div>

          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <User className="text-[#0B1E4A]" size={22} />
          </div>

        </div>

        {/* Body */}

        <div className="p-6 space-y-5">

          {/* Phone */}

          <div>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Phone Number
            </label>

            <div className="mt-2 flex gap-2">

              <input
                type="text"
                placeholder="Enter phone number"
                value={customer.phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                className="
                  flex-1
                  rounded-xl
                  border
                  border-slate-300
                  px-4
                  py-3
                  focus:ring-2
                  focus:ring-blue-500
                  outline-none
                "
              />

              <button
                onClick={onSearchCustomer}
                className="
                  h-12
                  w-12
                  rounded-xl
                  bg-[#0B1E4A]
                  text-white
                  flex
                  items-center
                  justify-center
                  hover:bg-blue-900
                "
              >
                <Search size={18} />
              </button>

            </div>

          </div>

          {/* Customer Details */}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">

                <User
                  className="text-[#0B1E4A]"
                  size={24}
                />

              </div>

              <div className="flex-1">

                <h3 className="font-bold text-slate-800">
                  {customer.name || "Walk-in Customer"}
                </h3>

                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                  <Phone size={15} />

                  <span>{customer.phone || "Not Available"}</span>

                </div>

                {customer.email && (

                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">

                    <Mail size={15} />

                    <span>{customer.email}</span>

                  </div>

                )}

              </div>

            </div>

          </div>

          {/* Loyalty */}

          <div className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-5">

            <div className="flex justify-between items-center">

              <div>

                <p className="text-xs uppercase tracking-widest text-blue-100">
                  Loyalty Points
                </p>

                <h2 className="mt-2 text-3xl font-bold">
                  {customer.points || 0}
                </h2>

              </div>

              <Star size={42} className="text-yellow-300" />

            </div>

          </div>

          {/* Add Customer */}

          <button
            onClick={onAddCustomer}
            className="
              w-full
              py-3
              rounded-xl
              bg-emerald-600
              text-white
              font-semibold
              flex
              items-center
              justify-center
              gap-2
              hover:bg-emerald-700
            "
          >
            <UserPlus size={18} />
            Add New Customer
          </button>

        </div>

      </div>

    </div>
  );
}