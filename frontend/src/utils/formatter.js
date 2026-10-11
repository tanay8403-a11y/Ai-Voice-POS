/**
 * Generic display formatters — dates, times, phone numbers, invoice
 * numbers, and quantity units. Kept separate from currency.js since
 * these aren't money-specific.
 */

export function formatDate(dateInput, { includeTime = false } = {}) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";

  const dateStr = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (!includeTime) return dateStr;

  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateStr}, ${timeStr}`;
}

export function formatTime(dateInput) {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function formatQuantity(quantity, unit = "pcs") {
  const num = Number(quantity);
  const display = Number.isInteger(num) ? num : num.toFixed(2);
  return `${display} ${unit}`;
}

export function truncate(text, maxLength = 40) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}