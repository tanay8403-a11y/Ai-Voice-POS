import api from "./api";

/*
 * Sales Summary
 */
export async function getSalesSummary(startDate, endDate) {
  const { data } = await api.get("/reports/sales-summary", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return data;
}

/*
 * Top Products
 */
export async function getTopProducts(
  limit = 10,
  startDate,
  endDate
) {
  const { data } = await api.get("/reports/top-products", {
    params: {
      limit,
      start_date: startDate,
      end_date: endDate,
    },
  });

  return data;
}

/*
 * Payment Breakdown
 */
export async function getPaymentBreakdown(
  startDate,
  endDate
) {
  const { data } = await api.get("/reports/payment-breakdown", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return data;
}

/*
 * Voice Analytics
 */
export async function getVoiceAnalytics(
  startDate,
  endDate
) {
  const { data } = await api.get("/reports/voice-analytics", {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  });

  return data;
}

/*
 * Revenue Trend
 */
export async function getRevenueTrend(days = 30) {
  const { data } = await api.get("/reports/revenue-trend", {
    params: { days },
  });

  return data;
}

/*
 * Inventory Valuation
 */
export async function getInventoryValuation() {
  const { data } = await api.get("/reports/inventory-valuation");

  return data;
}

/*
 * Temporary compatibility aliases
 */
export const getDashboardSummary = getSalesSummary;
export const getSalesOverview = getRevenueTrend;
export const getCommandAnalytics = getVoiceAnalytics;

/*
 * Placeholder until backend endpoint exists
 */
export async function getRecentTransactions() {
  return [];
}