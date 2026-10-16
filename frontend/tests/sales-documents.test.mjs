import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  saveQuote,
  changeQuote,
  invoice,
  pay,
  today,
} from "../src/erp/model.ts";
import {
  financialSummary,
  salesRelations,
  creditDueDate,
} from "../src/erp/sales-document-data.ts";

test("agreed quotation details and immutable snapshots survive conversion, catalog edits and invoicing", () => {
  const s = initialState();
  const p = s.products[0],
    c = s.customers[0];
  c.paymentTerms = "Entrega pactada";
  const q = saveQuote(s, {
    date: today(),
    partyId: c.id,
    warehouseId: s.warehouses[0].id,
    method: "Crédito 30 días",
    voucher: "Factura electrónica",
    lines: [{ productId: p.id, quantity: 2, price: 19.5 }],
    discount: 3,
    freight: 5,
    notes: "Acuerdo comercial",
    validity: 15,
  });
  const original = structuredClone(q);
  changeQuote(s, q.id, "send");
  changeQuote(s, q.id, "accept");
  const order = s.documents.find((d) => d.id === q.orderId);
  assert.equal(order.sourceId, q.id);
  assert.equal(order.total, 41);
  assert.equal(order.discount, 3);
  assert.equal(order.freight, 5);
  assert.equal(order.notes, q.notes);
  assert.equal(order.commercialTerms, "Entrega pactada");
  c.name = "Nombre modificado";
  c.address = "Otra dirección";
  p.name = "Otro producto";
  assert.equal(order.customerSnapshot.name, original.customerSnapshot.name);
  assert.equal(
    order.lines[0].productSnapshot.name,
    original.lines[0].productSnapshot.name,
  );
  const before = s.stock[p.id][order.warehouseId],
    cp = invoice(s, order.id, "Factura electrónica", today());
  assert.equal(cp.customerSnapshot.name, original.customerSnapshot.name);
  assert.equal(cp.total, 41);
  assert.equal(cp.balance, 41);
  assert.equal(s.stock[p.id][order.warehouseId], before - 2);
  const rel = salesRelations(s, cp);
  assert.equal(rel.quote.id, q.id);
  assert.equal(rel.order.id, order.id);
  assert.equal(rel.movements.length, 1);
  const movements = s.movements.length;
  assert.throws(
    () => invoice(s, order.id, "Factura electrónica", today()),
    /facturada/,
  );
  assert.equal(s.movements.length, movements);
  order.status = "Pendiente";
  assert.throws(
    () => invoice(s, order.id, "Factura electrónica", today()),
    /facturada/,
  );
  assert.equal(s.movements.length, movements);
  order.status = "Facturada";
  pay(s, cp.id, {
    date: today(),
    amount: 10,
    method: "Efectivo",
    reference: "P1",
  });
  assert.equal(cp.balance, 31);
  assert.equal(cp.statusHistory.at(-1).status, "Pago parcial");
  assert.equal(order.statusHistory.at(-1).status, "Facturada");
  const stored = JSON.parse(JSON.stringify(s));
  assert.equal(
    salesRelations(
      stored,
      stored.documents.find((d) => d.id === cp.id),
    ).quote.id,
    q.id,
  );
});
test("historical totals stay authoritative even when their line sum differs", () => {
  const historic = {
    lines: [{ productId: "P", quantity: 2, price: 50 }],
    discount: 5,
    freight: 0,
    total: 118,
  };
  const original = JSON.stringify(historic),
    f = financialSummary(historic);
  assert.equal(f.total, 118);
  assert.equal(f.base, 100);
  assert.equal(f.tax, 18);
  assert.equal(f.difference, 23);
  assert.equal(JSON.stringify(historic), original);
});
test("orphan invoices never borrow an unrelated quotation; missing histories remain absent", () => {
  const s = initialState(),
    cp = {
      ...s.documents.find((d) => d.kind === "CP"),
      sourceId: "missing",
      createdAt: undefined,
      statusHistory: undefined,
    };
  const r = salesRelations(s, cp);
  assert.equal(r.order, undefined);
  assert.equal(r.quote, undefined);
  assert.equal(cp.createdAt, undefined);
  assert.equal(cp.statusHistory, undefined);
  assert.equal(creditDueDate("2026-01-31", "Crédito 30 días"), "2026-03-02");
  assert.equal(creditDueDate("2026-01-31", "Contado"), null);
});
