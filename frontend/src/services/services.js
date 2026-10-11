/**
 * Reports service: dashboard analytics endpoints.
 */

import api from "./api";

export async function getSalesSummary(startDate, endDate) {
  const response = await api.get("/reports/sales-summary", {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
}

export async function getTopProducts(limit = 10, startDate, endDate) {
  const response = await api.get("/reports/top-products", {
    params: { limit, start_date: startDate, end_date: endDate },
  });
  return response.data;
}

export async function getRevenueTrend(days = 30) {
  const response = await api.get("/reports/revenue-trend", { params: { days } });
  return response.data;
}

export async function getPaymentBreakdown(startDate, endDate) {
  const response = await api.get("/reports/payment-breakdown", {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
}

export async function getInventoryValuation() {
  const response = await api.get("/reports/inventory-valuation");
  return response.data;
}