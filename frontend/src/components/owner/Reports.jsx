import { Download, Filter } from "lucide-react";

const transactions = [
  {
    id: "#ORD-9402",
    customer: "Rahul Sharma",
    terminal: "Terminal 01",
    date: "12 Oct, 14:20",
    amount: "₹1,240.00",
    status: "Completed",
  },
  {
    id: "#ORD-9401",
    customer: "Anita Singh",
    terminal: "Terminal 04",
    date: "12 Oct, 14:15",
    amount: "₹850.50",
    status: "Pending",
  },
  {
    id: "#ORD-9400",
    customer: "Walking Customer",
    terminal: "Terminal 02",
    date: "12 Oct, 14:02",
    amount: "₹2,100.00",
    status: "Completed",
  },
  {
    id: "#ORD-9399",
    customer: "Vikram Mehta",
    terminal: "Terminal 01",
    date: "12 Oct, 13:45",
    amount: "₹420.00",
    status: "Completed",
  },
  {
    id: "#ORD-9398",
    customer: "Sana Kapoor",
    terminal: "Terminal 03",
    date: "12 Oct, 13:30",
    amount: "₹1,150.00",
    status: "Refunded",
  },
];

const statusColor = {
  Completed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Refunded: "bg-red-100 text-red-700",
};

export default function Reports() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6">

        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Recent Transactions
          </h2>

          <p className="text-slate-500 mt-1">
            Live feed of orders across all terminals
          </p>
        </div>

        <div className="flex gap-3">

          <div className="relative">
            <Filter
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              placeholder="Filter orders..."
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button className="flex items-center gap-2 bg-blue-700 text-white px-4 rounded-xl hover:bg-blue-800 transition">
            <Download size={18} />
            Export
          </button>

        </div>

      </div>

      {/* Table */}

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr className="text-left text-sm text-slate-500">

              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Terminal</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Status</th>

            </tr>

          </thead>

          <tbody>

            {transactions.map((item) => (

              <tr
                key={item.id}
                className="border-t hover:bg-slate-50 transition"
              >
                <td className="px-6 py-4 font-semibold text-blue-700">
                  {item.id}
                </td>

                <td className="px-6 py-4">
                  {item.customer}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.terminal}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.date}
                </td>

                <td className="px-6 py-4 text-right font-semibold">
                  {item.amount}
                </td>

                <td className="px-6 py-4 text-center">

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor[item.status]}`}
                  >
                    {item.status}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* Footer */}

      <div className="flex items-center justify-between p-6 border-t">

        <p className="text-sm text-slate-500">
          Showing 5 of 156 transactions
        </p>

        <div className="flex gap-2">

          <button className="w-9 h-9 rounded-lg border hover:bg-slate-100">
            &lt;
          </button>

          <button className="w-9 h-9 rounded-lg bg-blue-700 text-white">
            1
          </button>

          <button className="w-9 h-9 rounded-lg border hover:bg-slate-100">
            2
          </button>

          <button className="w-9 h-9 rounded-lg border hover:bg-slate-100">
            3
          </button>

          <button className="w-9 h-9 rounded-lg border hover:bg-slate-100">
            &gt;
          </button>

        </div>

      </div>

    </div>
  );
}