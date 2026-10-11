/**
 * Currency formatting helpers — Indian Rupee formatting with proper
 * lakh/crore grouping, used across Cart, BillSummary, Invoice, Reports.
 */

export function formatCurrency(amount, { showSymbol = true } = {}) {
  const value = Number(amount) || 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const sign = value < 0 ? "-" : "";
  const symbol = showSymbol ? "₹" : "";
  return `${sign}${symbol}${formatted}`;
}

export function parseCurrencyInput(value) {
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** Calculates change due for cash payments. */
export function calculateChange(amountReceived, totalDue) {
  const change = roundToTwo(amountReceived - totalDue);
  return change > 0 ? change : 0;
}