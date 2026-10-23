import type { State } from "./model.ts";

// Removes only explicitly simulated operational records, preserving real catalog data.
export function clearDemoOperations(state: State): boolean {
  const demoDocumentIds = new Set(
    state.documents.filter((document) => document.demo).map((document) => document.id),
  );
  const demoQuoteIds = new Set(
    state.quotes.filter((quote) => quote.demo).map((quote) => quote.id),
  );
  const removedReferences = new Set([...demoDocumentIds, ...demoQuoteIds]);
  let changed = false;

  state.movements = state.movements.filter((movement) => {
    if (!demoDocumentIds.has(movement.documentId)) return true;
    const warehouseStock = (state.stock[movement.productId] ??= {});
    warehouseStock[movement.warehouseId] =
      (warehouseStock[movement.warehouseId] ?? 0) +
      (movement.type === "Entrada" ? -movement.quantity : movement.quantity);
    changed = true;
    return false;
  });
  state.documents = state.documents.filter((document) => {
    const remove = demoDocumentIds.has(document.id);
    changed ||= remove;
    return !remove;
  });
  state.quotes = state.quotes.filter((quote) => {
    const remove = demoQuoteIds.has(quote.id);
    changed ||= remove;
    return !remove;
  });
  for (const document of state.documents) {
    if (document.sourceId && removedReferences.has(document.sourceId)) {
      document.sourceId = undefined;
      changed = true;
    }
  }
  for (const quote of state.quotes) {
    if (quote.orderId && demoDocumentIds.has(quote.orderId)) {
      quote.orderId = undefined;
      changed = true;
    }
  }
  if (state.payables) {
    state.payables = state.payables.filter((payable) => {
      const remove = payable.demo || demoDocumentIds.has(payable.documentId);
      changed ||= remove;
      return !remove;
    });
  }
  if (state.inventoryValuations) {
    state.inventoryValuations = state.inventoryValuations.filter((valuation) => {
      const remove = valuation.demo === true;
      changed ||= remove;
      return !remove;
    });
  }
  if (state.demoDashboardVersion !== 1) {
    state.demoDashboardVersion = 1;
    changed = true;
  }
  return changed;
}

// One-time transition to an empty operational ledger. Keep all existing
// categories, warehouses and company settings exactly as stored.
export function cleanBusinessData(state: State): boolean {
  if (state.businessCleanupVersion === 1) return false;
  state.products = [];
  state.customers = [];
  state.suppliers = [];
  state.documents = [];
  state.quotes = [];
  state.movements = [];
  state.stock = {};
  state.audit = [];
  state.payables = [];
  state.inventoryValuations = [];
  state.users = state.users?.filter((user) => ![
    "USR-002|ana.torres@enterprisecloud.pe|Ana Torres",
    "USR-003|diego.salazar@enterprisecloud.pe|Diego Salazar",
    "USR-004|lucia.mendoza@enterprisecloud.pe|Lucía Mendoza",
    "USR-005|marco.rivas@enterprisecloud.pe|Marco Rivas",
  ].includes(`${user.id}|${user.email}|${user.name}`));
  delete state.clearedOperationDates;
  delete state.demoDashboardVersion;
  state.businessCleanupVersion = 1;
  return true;
}
