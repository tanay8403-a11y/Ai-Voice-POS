import {
  MoreVertical,
  TrendingUp,
} from "lucide-react";

const products = [
  {
    name: "Double Espresso",
    sold: 124,
    revenue: "₹15,400",
    image:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200",
    progress: "100%",
  },
  {
    name: "Avocado Toast",
    sold: 98,
    revenue: "₹12,800",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200",
    progress: "80%",
  },
  {
    name: "Matcha Latte",
    sold: 86,
    revenue: "₹11,200",
    image:
      "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=200",
    progress: "65%",
  },
  {
    name: "Blueberry Muffin",
    sold: 72,
    revenue: "₹5,400",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200",
    progress: "45%",
  },
];

export default function SalesOverview() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* Sales Graph */}
      <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Sales Volume
            </h2>

            <p className="text-slate-500 text-sm mt-1">
              Performance over last 7 days
            </p>
          </div>

          <div className="bg-slate-100 rounded-lg p-1 flex">
            <button className="bg-white px-4 py-2 rounded-md shadow text-sm font-semibold">
              Week
            </button>

            <button className="px-4 py-2 text-sm text-slate-500">
              Month
            </button>
          </div>
        </div>

        {/* SVG Graph */}
        <div className="h-80">

          <svg
            viewBox="0 0 800 300"
            className="w-full h-full"
          >
            <defs>
              <linearGradient
                id="gradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#1d4ed8"
                  stopOpacity="0.25"
                />
                <stop
                  offset="100%"
                  stopColor="#1d4ed8"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[50, 150, 250].map((y) => (
              <line
                key={y}
                x1="0"
                x2="800"
                y1={y}
                y2={y}
                stroke="#dbe4ef"
                strokeDasharray="5"
              />
            ))}

            <path
              fill="url(#gradient)"
              d="M0,250
                 L100,180
                 L200,210
                 L300,120
                 L400,150
                 L500,80
                 L600,110
                 L700,40
                 L800,60
                 L800,300
                 L0,300Z"
            />

            <path
              d="M0,250
                 L100,180
                 L200,210
                 L300,120
                 L400,150
                 L500,80
                 L600,110
                 L700,40
                 L800,60"
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="4"
              strokeLinecap="round"
            />

            <circle
              cx="700"
              cy="40"
              r="7"
              fill="white"
              stroke="#1d4ed8"
              strokeWidth="3"
            />
          </svg>

          <div className="flex justify-between mt-3 text-sm text-slate-500">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=>(
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            Top Products
          </h2>

          <MoreVertical className="text-slate-500" size={20}/>
        </div>

        <div className="space-y-5">

          {products.map((item) => (

            <div
              key={item.name}
              className="flex gap-4 items-center hover:bg-slate-50 rounded-xl p-2 transition"
            >
              <img
                src={item.image}
                className="w-14 h-14 rounded-xl object-cover"
              />

              <div className="flex-1">

                <h4 className="font-semibold">
                  {item.name}
                </h4>

                <p className="text-sm text-slate-500">
                  {item.sold} units sold
                </p>

                <div className="h-2 bg-slate-100 rounded-full mt-2">

                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: item.progress }}
                  />
                </div>
              </div>

              <div className="text-right">

                <p className="font-bold text-green-600">
                  {item.revenue}
                </p>

                <TrendingUp
                  size={16}
                  className="ml-auto text-green-600 mt-1"
                />
              </div>

            </div>

          ))}

        </div>

        <button className="mt-6 w-full border border-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-50 transition">
          View Full Report
        </button>

      </div>

    </div>
  );
}