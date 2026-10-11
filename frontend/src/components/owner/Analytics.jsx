import SalesChart from "./SalesChart";
import TopProducts from "./TopProducts";

export default function Analytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Sales Chart */}
      <SalesChart />

      {/* Top Products */}
      <TopProducts />

    </div>
  );
}