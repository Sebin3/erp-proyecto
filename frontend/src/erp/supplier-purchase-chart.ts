import type { Document } from "./model.ts";

// Preserve exactly the orders eligible for the existing supplier history.
export function supplierPurchaseRanking(orders: readonly Document[]) {
  return [...orders].sort((a, b) => b.total - a.total || b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
}
