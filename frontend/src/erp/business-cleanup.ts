import type { State } from "./model.ts";

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
