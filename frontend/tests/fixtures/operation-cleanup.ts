import { quantityRound, round, type State } from "../../src/erp/model.ts";

// One-time cleanup explicitly requested for this date. Later entries remain valid.
export function clearOctober16Operations(state: State): boolean {
  const date = "2026-10-16";
  if (state.clearedOperationDates?.includes(date)) return false;
  const removed = new Set([
    ...state.documents.filter((d) => d.date === date).map((d) => d.id),
    ...state.quotes.filter((q) => q.date === date).map((q) => q.id),
  ]);
  const affectedPurchases = new Set(state.documents.filter((d) => d.kind === "NI" && removed.has(d.id)).map((d) => d.sourceId));
  const affectedOrders = new Set(state.documents.filter((d) => d.kind === "CP" && removed.has(d.id)).map((d) => d.sourceId));
  // Reverse only the stock changes belonging to the removed operations.
  state.movements = state.movements.filter((movement) => {
    if (!removed.has(movement.documentId) && movement.date !== date) return true;
    const warehouses = state.stock[movement.productId] ??= {};
    warehouses[movement.warehouseId] = quantityRound((warehouses[movement.warehouseId] ?? 0) + (movement.type === "Entrada" ? -movement.quantity : movement.quantity));
    return false;
  });
  state.documents = state.documents.filter((d) => !removed.has(d.id));
  state.quotes = state.quotes.filter((q) => !removed.has(q.id));
  for (const document of state.documents) {
    if (document.sourceId && removed.has(document.sourceId)) document.sourceId = undefined;
    const payments = document.payments.filter((payment) => payment.date !== date);
    if (payments.length !== document.payments.length) {
      document.payments = payments;
      document.balance = round(document.total - payments.reduce((sum, payment) => sum + payment.amount, 0));
      if (document.kind === "CP") document.status = document.balance === 0 ? "Pagada" : payments.length ? "Pago parcial" : "Pendiente de pago";
    }
    if (document.kind === "OC" && affectedPurchases.has(document.id)) {
      document.received = {};
      for (const note of state.documents.filter((d) => d.kind === "NI" && d.sourceId === document.id)) {
        for (const line of note.lines) document.received[line.productId] = quantityRound((document.received[line.productId] ?? 0) + line.quantity);
      }
      document.status = document.lines.every((line) => (document.received?.[line.productId] ?? 0) >= line.quantity) ? "Recibida" : Object.values(document.received).some((q) => q > 0) ? "Recibida parcial" : "Pendiente";
    }
    if (document.kind === "OV" && affectedOrders.has(document.id) && !state.documents.some((d) => d.kind === "CP" && d.sourceId === document.id)) document.status = "Pendiente";
  }
  for (const quote of state.quotes) {
    if (quote.orderId && removed.has(quote.orderId)) { quote.orderId = undefined; quote.status = "Aceptada"; }
    else if (quote.orderId && affectedOrders.has(quote.orderId) && !state.documents.some((d) => d.kind === "CP" && d.sourceId === quote.orderId)) quote.status = "Aceptada";
  }
  if (state.payables) state.payables = state.payables.filter((p) => p.date !== date && !removed.has(p.documentId));
  state.inventoryValuations = state.inventoryValuations?.filter((v) => v.date !== date);
  (state.clearedOperationDates ??= []).push(date);
  return true;
}
