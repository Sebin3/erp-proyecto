import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  createDocument,
  receive,
  invoice,
  pay,
  saveQuote,
  changeQuote,
  stockOf,
  today,
  total,
} from "../src/erp/model.ts";

test("fractional inventory quantities are retained independently of money rounding", () => {
  const s = initialState(),
    d = draft(s, "OC", 0.123),
    before = stockOf(s, d.lines[0].productId, d.warehouseId),
    oc = createDocument(s, d);
  receive(s, oc.id, { [d.lines[0].productId]: 0.023 }, d.warehouseId, today());
  receive(s, oc.id, { [d.lines[0].productId]: 0.1 }, d.warehouseId, today());
  assert.equal(oc.status, "Recibida");
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before + 0.123);
});
test("invalid dates and amounts below one cent are rejected", () => {
  const s = initialState(),
    d = draft(s);
  assert.throws(() => createDocument(s, { ...d, date: "2026-02-30" }));
  const oc = createDocument(s, draft(s, "OC"));
  assert.throws(() =>
    receive(s, oc.id, { [d.lines[0].productId]: 1 }, d.warehouseId, "bad"),
  );
  const cp = invoice(s, createDocument(s, d).id, d.voucher, today());
  assert.throws(() =>
    pay(s, cp.id, {
      date: today(),
      amount: 0.004,
      method: "Efectivo",
      reference: "test",
    }),
  );
});

function draft(state, kind = "OV", quantity = 2) {
  return {
    kind,
    date: today(),
    partyId: (kind === "OC" ? state.suppliers : state.customers)[0].id,
    warehouseId: "ALM-01",
    method: "Crédito 30 días",
    voucher: "Factura electrónica",
    lines: [{ productId: state.products[0].id, quantity, price: 2 }],
    discount: 0,
    freight: 0,
    notes: "",
  };
}
test("purchase order does not change stock; partial and final receptions do", () => {
  const s = initialState(),
    d = draft(s, "OC", 10),
    before = stockOf(s, d.lines[0].productId, d.warehouseId);
  const oc = createDocument(s, d);
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before);
  const first = receive(
    s,
    oc.id,
    { [d.lines[0].productId]: 4 },
    d.warehouseId,
    today(),
  );
  assert.equal(oc.status, "Recibida parcial");
  assert.equal(first.sourceId, oc.id);
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before + 4);
  receive(s, oc.id, { [d.lines[0].productId]: 6 }, d.warehouseId, today());
  assert.equal(oc.status, "Recibida");
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before + 10);
  assert.throws(() =>
    receive(s, oc.id, { [d.lines[0].productId]: 1 }, d.warehouseId, today()),
  );
});
test("rejects reception larger than outstanding quantity without altering state", () => {
  const s = initialState(),
    d = draft(s, "OC", 10),
    oc = createDocument(s, d),
    before = JSON.stringify(s);
  assert.throws(() =>
    receive(s, oc.id, { [d.lines[0].productId]: 11 }, d.warehouseId, today()),
  );
  assert.equal(JSON.stringify(s), before);
});

test("receipt request cannot be replayed while a purchase is still partially pending", () => {
  const s = initialState(),
    d = draft(s, "OC", 10),
    oc = createDocument(s, d);
  const note = receive(
    s,
    oc.id,
    { [d.lines[0].productId]: 4 },
    d.warehouseId,
    today(),
    "receipt-request-test",
  );
  const snapshot = JSON.stringify(s);
  assert.equal(note.balance, 0);
  assert.equal(note.receiptRequestId, "receipt-request-test");
  assert.throws(
    () =>
      receive(
        s,
        oc.id,
        { [d.lines[0].productId]: 4 },
        d.warehouseId,
        today(),
        "receipt-request-test",
      ),
    /ya fue registrada/,
  );
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(oc.received[d.lines[0].productId], 4);
});

test("receipt rejects unknown products and invalid precision without changing documents or inventory", () => {
  const s = initialState(),
    d = draft(s, "OC", 10),
    oc = createDocument(s, d);
  const snapshot = JSON.stringify(s);
  for (const quantities of [
    { unknown: 1 },
    { [d.lines[0].productId]: 0.0001 },
    { [d.lines[0].productId]: NaN },
  ]) {
    assert.throws(() => receive(s, oc.id, quantities, d.warehouseId, today()));
    assert.equal(JSON.stringify(s), snapshot);
  }
});

test("multi-product receipt changes only the receiving warehouse and creates a matching movement for every line", () => {
  const s = initialState(),
    d = draft(s, "OC", 10);
  d.lines.push({ productId: s.products[1].id, quantity: 5, price: 3 });
  const oc = createDocument(s, d);
  const originalWarehouse = d.lines.map((l) =>
    stockOf(s, l.productId, "ALM-01"),
  );
  const receivingWarehouse = d.lines.map((l) =>
    stockOf(s, l.productId, "ALM-02"),
  );
  const note = receive(
    s,
    oc.id,
    { [d.lines[0].productId]: 4, [d.lines[1].productId]: 5 },
    "ALM-02",
    today(),
  );
  assert.equal(oc.status, "Recibida parcial");
  const movements = s.movements.filter((m) => m.documentId === note.id);
  assert.equal(movements.length, 2);
  note.lines.forEach((l, i) => {
    assert.equal(stockOf(s, l.productId, "ALM-01"), originalWarehouse[i]);
    assert.equal(
      stockOf(s, l.productId, "ALM-02"),
      receivingWarehouse[i] + l.quantity,
    );
    const movement = movements.find((m) => m.productId === l.productId);
    assert.equal(movement.quantity, l.quantity);
    assert.equal(movement.cost, l.price);
    assert.equal(movement.balance, stockOf(s, l.productId, "ALM-02"));
  });
});
test("sale order does not reduce stock; credit invoice does and creates debt", () => {
  const s = initialState(),
    d = draft(s),
    before = stockOf(s, d.lines[0].productId, d.warehouseId),
    ov = createDocument(s, d);
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before);
  const cp = invoice(s, ov.id, d.voucher, today());
  assert.equal(cp.balance, 4);
  assert.equal(cp.status, "Pendiente de pago");
  assert.equal(cp.sourceId, ov.id);
  assert.equal(ov.status, "Facturada");
  assert.equal(stockOf(s, d.lines[0].productId, d.warehouseId), before - 2);
  assert.throws(() => invoice(s, ov.id, d.voucher, today()));
});
test("stock is checked again at invoicing when orders compete for stock", () => {
  const s = initialState(),
    d = draft(s),
    quantity = stockOf(s, d.lines[0].productId, d.warehouseId);
  d.lines[0].quantity = quantity;
  const a = createDocument(s, d),
    b = createDocument(s, d);
  invoice(s, a.id, d.voucher, today());
  const before = JSON.stringify(s);
  assert.throws(
    () => invoice(s, b.id, d.voucher, today()),
    /Stock insuficiente/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("partial payment and settlement preserve stock and reject overpayment", () => {
  const s = initialState(),
    d = draft(s),
    ov = createDocument(s, d),
    cp = invoice(s, ov.id, d.voucher, today()),
    stock = JSON.stringify(s.stock);
  const payment = { date: today(), method: "Efectivo", reference: "TEST" };
  pay(s, cp.id, { ...payment, amount: 1.5 });
  assert.equal(cp.balance, 2.5);
  assert.equal(cp.status, "Pago parcial");
  const before = JSON.stringify(s);
  assert.throws(() => pay(s, cp.id, { ...payment, amount: 3 }));
  assert.equal(JSON.stringify(s), before);
  pay(s, cp.id, { ...payment, amount: 2.5 });
  assert.equal(cp.status, "Pagada");
  assert.equal(cp.balance, 0);
  assert.equal(JSON.stringify(s.stock), stock);
});
test("cash invoice registers full payment and no receivable", () => {
  const s = initialState(),
    d = draft(s);
  d.method = "Contado";
  const cp = invoice(
    s,
    createDocument(s, d).id,
    "Boleta de venta electrónica",
    today(),
  );
  assert.equal(cp.balance, 0);
  assert.equal(cp.payments[0].amount, cp.total);
  assert.match(cp.number, /^B001-/);
});
test("quotation can propose out-of-stock goods but acceptance checks availability", () => {
  const s = initialState(),
    d = draft(s, "OV", 9999),
    q = saveQuote(s, { ...d, validity: 15 });
  changeQuote(s, q.id, "send");
  const before = JSON.stringify(s);
  assert.throws(() => changeQuote(s, q.id, "accept"), /Stock insuficiente/);
  assert.equal(JSON.stringify(s), before);
});
test("quotation conversion links order, processing follows invoicing", () => {
  const s = initialState(),
    d = draft(s),
    q = saveQuote(s, { ...d, validity: 15 });
  changeQuote(s, q.id, "send");
  changeQuote(s, q.id, "accept");
  assert.equal(q.status, "Aceptada");
  const ov = s.documents.find((d) => d.id === q.orderId);
  assert.equal(ov.sourceId, q.id);
  invoice(s, ov.id, d.voucher, today());
  assert.equal(q.status, "Procesada");
  assert.throws(() => changeQuote(s, q.id, "accept"));
  assert.throws(() => saveQuote(s, { ...d, validity: 15 }, q.id));
});
test("credit limit is enforced before inventory mutation", () => {
  const s = initialState(),
    d = draft(s);
  s.customers[0].credit = 0;
  const ov = createDocument(s, d),
    before = JSON.stringify(s);
  assert.throws(
    () => invoice(s, ov.id, d.voucher, today()),
    /línea de crédito/,
  );
  assert.equal(JSON.stringify(s), before);
});
test("validation rejects duplicate lines, nonfinite values and negative total", () => {
  const s = initialState(),
    d = draft(s);
  assert.throws(() =>
    createDocument(s, { ...d, lines: [...d.lines, ...d.lines] }),
  );
  assert.throws(() =>
    createDocument(s, { ...d, lines: [{ ...d.lines[0], quantity: NaN }] }),
  );
  assert.throws(() => createDocument(s, { ...d, discount: 999 }));
  assert.equal(
    total([{ productId: "x", quantity: 3, price: 0.1 }], 0.1, 0.05),
    0.25,
  );
});
test("serializing state retains documents, movement links, balances and quotations", () => {
  const s = initialState(),
    copy = JSON.parse(JSON.stringify(s));
  assert.deepEqual(copy.stock, s.stock);
  assert.deepEqual(copy.quotes, s.quotes);
  assert.deepEqual(copy.movements, s.movements);
  assert.deepEqual(
    copy.documents.map((d) => ({
      number: d.number,
      balance: d.balance,
      sourceId: d.sourceId,
      payments: d.payments,
    })),
    s.documents.map((d) => ({
      number: d.number,
      balance: d.balance,
      sourceId: d.sourceId,
      payments: d.payments,
    })),
  );
  for (const m of copy.movements)
    assert.ok(copy.documents.some((d) => d.id === m.documentId));
  assert.equal(
    new Set(copy.documents.map((d) => d.number)).size,
    copy.documents.length,
  );
  assert.equal(
    new Set(copy.documents.map((d) => d.id)).size,
    copy.documents.length,
  );
});
