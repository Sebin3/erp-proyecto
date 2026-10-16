import { type State } from "./model.ts";

// Purchase orders are the ERP's source of supplier obligations.
export function ensurePurchasePayables(state: State): boolean {
  let changed = state.payables === undefined;
  const accounts = state.payables ??= [];
  const linked = new Set(accounts.map((p) => p.documentId));
  for (const order of state.documents) {
    if (order.kind !== "OC" || linked.has(order.id) || /anulad|cancelad|devuelt/i.test(order.status)) continue;
    const due = new Date(`${order.date}T12:00:00Z`);
    due.setUTCDate(due.getUTCDate() + Number(/^Crédito (\d+) días$/.exec(order.method)?.[1] ?? 0));
    accounts.push({
      id: `CXP-${order.id}`, documentId: order.id, supplierId: order.partyId,
      date: order.date, dueDate: due.toISOString().slice(0, 10),
      total: order.total, balance: order.total, payments: [], demo: order.demo,
    });
    linked.add(order.id);
    changed = true;
  }
  return changed;
}
