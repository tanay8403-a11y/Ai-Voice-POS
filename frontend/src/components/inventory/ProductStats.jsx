import {
  Package,
  AlertTriangle,
  Boxes,
  IndianRupee,
} from "lucide-react";

export default function ProductStats({ products = [] }) {
  const totalProducts = products.length;

  const activeProducts = products.filter(
    (p) => p.is_active !== false
  ).length;

  const lowStock = products.filter(
    (p) =>
      (p.stock ?? p.current_stock ?? 0) <=
      (p.reorder_level ?? 10)
  ).length;

  const inventoryValue = products.reduce((sum, p) => {
    const stock = p.stock ?? p.current_stock ?? 0;
    const cost = Number(p.cost_price ?? 0);
    return sum + stock * cost;
  }, 0);

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: Package,
      color: "products-stat-blue",
    },
    {
      title: "Active Products",
      value: activeProducts,
      icon: Boxes,
      color: "products-stat-green",
    },
    {
      title: "Low Stock",
      value: lowStock,
      icon: AlertTriangle,
      color: "products-stat-orange",
    },
    {
      title: "Inventory Value",
      value: `₹${inventoryValue.toLocaleString()}`,
      icon: IndianRupee,
      color: "products-stat-sand",
    },
  ];

  return (
    <div className="products-stats">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="products-stat-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="products-stat-label">
                  {item.title}
                </p>

                <h2 className="products-stat-value">
                  {item.value}
                </h2>
              </div>

              <div
                className={`products-stat-icon ${item.color}`}
              >
                <Icon size={28} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
    