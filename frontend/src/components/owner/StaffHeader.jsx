import { Plus, Search } from "lucide-react";

export default function StaffHeader({
    search,
    setSearch,
    onAddStaff,
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

            <div className="flex flex-col lg:flex-row justify-between gap-4">

                <div>

                    <h2 className="text-3xl font-bold text-slate-800">
                        Staff Management
                    </h2>

                    <p className="text-slate-500 mt-1">
                        Manage cashiers, managers and permissions.
                    </p>

                </div>

                <div className="flex gap-3">

                    <div className="relative">

                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={search}
                            onChange={(e)=>setSearch(e.target.value)}
                            placeholder="Search Staff"
                            className="pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-200 outline-none w-72"
                        />

                    </div>

                    <button
                        onClick={onAddStaff}
                        className="bg-[#0B1E4A] text-white px-5 rounded-xl flex items-center gap-2 hover:bg-blue-900"
                    >
                        <Plus size={18}/>
                        Add Staff
                    </button>

                </div>

            </div>

        </div>
    );
}