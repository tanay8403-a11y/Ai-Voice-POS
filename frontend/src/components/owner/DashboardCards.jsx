import {
  IndianRupee,
  MonitorSmartphone,
  AlertTriangle,
  Receipt,
  TrendingUp,
} from "lucide-react";

export default function DashboardCards() {
  const cards = [
    {
      title: "Today's Revenue",
      value: "12,450",
      icon: IndianRupee,
      color: "text-blue-700",
      bg: "bg-blue-50",
      extra: "+12%",
      progress: "75%",
    },
    {
      title: "Active Terminals",
      value: "04",
      icon: MonitorSmartphone,
      color: "text-green-600",
      bg: "bg-green-50",
      extra: "Online",
      progress: "100%",
    },
    {
      title: "Low Stock Alerts",
      value: "12",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      extra: "Action Required",
      progress: "35%",
    },
    {
      title: "Total Orders",
      value: "156",
      icon: Receipt,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      extra: "+8.4%",
      progress: "95%",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-lg"
          >
            {/* Background Icon */}
            <div className="absolute top-4 right-4 opacity-10">
              <Icon size={70} className={card.color} />
            </div>

            <p className="uppercase text-xs tracking-widest text-slate-500 font-semibold">
              {card.title}
            </p>

            <div className="mt-4 flex items-end gap-2">
              <h2 className="text-4xl font-bold text-slate-800 flex items-center">
                {card.title.includes("Revenue") && (
                  <IndianRupee size={30} className="mr-1" />
                )}
                {card.value}
              </h2>

              <span
                className={`text-sm font-semibold flex items-center ${
                  card.title === "Low Stock Alerts"
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {card.title !== "Active Terminals" && (
                  <TrendingUp size={16} className="mr-1" />
                )}
                {card.extra}
              </span>
            </div>

            <div className="mt-5">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    card.title === "Low Stock Alerts"
                      ? "bg-red-500"
                      : "bg-blue-700"
                  }`}
                  style={{ width: card.progress }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}