import {
  createDocument,
  receive,
  invoice,
  pay,
  saveQuote,
  today,
  type State,
  type Draft,
} from "./model.ts";

// Explicit DEMO records only. Existing records and their identifiers are never rewritten.
export function completeDashboardDemo(state: State): boolean {
  if (state.demoDashboardVersion === 1) return false;
  const products = state.products.filter((p) => p.demo && p.active);
  const customers = state.customers.filter(
    (c) => c.demo && c.active && c.credit > 500,
  );
  const suppliers = state.suppliers.filter((s) => s.demo && s.active);
  const warehouse = state.warehouses.find((w) => w.active);
  if (
    products.length < 3 ||
    customers.length < 2 ||
    suppliers.length < 1 ||
    !warehouse ||
    !state.documents.some((d) => d.demo)
  )
    return false;
  const shifted = (days: number) => {
    const d = new Date(`${today()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };
  const draft = (
    kind: "OC" | "OV",
    partyId: string,
    index: number,
    quantity: number,
    date: string,
  ): Draft => ({
    kind,
    partyId,
    warehouseId: warehouse.id,
    date,
    method: "Crédito 30 días",
    voucher: "Factura electrónica",
    lines: [
      {
        productId: products[index].id,
        quantity,
        price: kind === "OC" ? products[index].cost : products[index].price,
      },
    ],
    discount: 0,
    freight: 0,
    notes: "Operación DEMO simulada · resumen ejecutivo",
  });
  // One historical purchase and its actual receipt make purchase history and Kardex consistent.
  if (products[0].cost > 0 && Number.isFinite(products[0].cost)) {
    const purchase = createDocument(
      state,
      draft("OC", suppliers[0].id, 0, 10, shifted(65)),
    );
    purchase.demo = true;
    const note = receive(
      state,
      purchase.id,
      { [products[0].id]: 10 },
      warehouse.id,
      purchase.date,
    );
    note.demo = true;
  }
  for (let i = 0; i < 2; i++) {
    const index = Math.min(i + 2, products.length - 1),
      product = products[index];
    const quantity = Math.min(2, state.stock[product.id]?.[warehouse.id] ?? 0);
    if (quantity <= 0 || product.price <= 0 || !Number.isFinite(product.price))
      continue;
    const customer = customers[i % customers.length];
    const debt = state.documents
      .filter((d) => d.kind === "CP" && d.partyId === customer.id)
      .reduce((sum, d) => sum + d.balance, 0);
    if (debt + quantity * product.price > customer.credit) continue;
    const input = draft(
      "OV",
      customers[i % customers.length].id,
      index,
      quantity,
      shifted(i === 0 ? 45 : 25),
    );
    const order = createDocument(state, input);
    order.demo = true;
    const bill = invoice(state, order.id, input.voucher, input.date);
    bill.demo = true;
    if (i === 0)
      pay(state, bill.id, {
        date: shifted(40),
        amount: Math.round(bill.total * 50) / 100,
        method: "Transferencia bancaria",
        reference: "Abono DEMO simulado",
      });
  }
  for (let i = 0; i < 2; i++) {
    if (products[Math.min(i, products.length - 1)].price <= 0) continue;
    const quote = saveQuote(state, {
      ...draft(
        "OV",
        customers[i % customers.length].id,
        Math.min(i, products.length - 1),
        3,
        shifted(i ? 12 : 5),
      ),
      validity: 15,
    });
    quote.demo = true;
    quote.notes = "Cotización DEMO simulada";
    if (i === 0) quote.status = "Enviada";
  }
  if (!state.payables) {
    const purchases = state.documents
      .filter((d) => d.demo && d.kind === "OC")
      .slice(0, 3);
    state.payables = purchases.map((d, i) => {
      const paid = i === 0 ? Math.round(d.total * 25) / 100 : 0;
      const date = d.date;
      const due = new Date(`${date}T12:00:00Z`);
      due.setUTCDate(due.getUTCDate() + (i === 1 ? 5 : 30));
      return {
        id: `DEMO-CXP-${i + 1}`,
        documentId: d.id,
        supplierId: d.partyId,
        date,
        dueDate: due.toISOString().slice(0, 10),
        total: d.total,
        balance: Math.round((d.total - paid) * 100) / 100,
        payments: paid
          ? [
              {
                id: `DEMO-PAGO-${i + 1}`,
                date,
                amount: paid,
                method: "Transferencia",
                reference: "Pago DEMO simulado",
              },
            ]
          : [],
        demo: true,
      };
    });
  }
  // Three explicit DEMO valuations reconstructed from the same stock and movements.
  if (
    !state.inventoryValuations &&
    state.products.every((p) => p.demo) &&
    state.documents.every((d) => d.demo)
  )
    state.inventoryValuations = [90, 45, 0].map((days) => {
      const date = shifted(days);
      const value = state.products.reduce(
        (sum, p) =>
          sum +
          state.warehouses.reduce((total, w) => {
            const after = state.movements
              .filter(
                (m) =>
                  m.productId === p.id &&
                  m.warehouseId === w.id &&
                  m.date > date,
              )
              .reduce(
                (s, m) => s + (m.type === "Entrada" ? m.quantity : -m.quantity),
                0,
              );
            return (
              total +
              Math.max(0, (state.stock[p.id]?.[w.id] ?? 0) - after) * p.cost
            );
          }, 0),
        0,
      );
      return {
        date,
        value: Math.round(value * 100) / 100,
        demo: true,
        includesTax: true,
      };
    });
  state.demoDashboardVersion = 1;
  return true;
}
