import test from "node:test";
import assert from "node:assert/strict";
import { populatedState } from "./fixtures/populated-state.ts";
import { completeDashboardDemo } from "./fixtures/dashboard-demo.ts";
import {
  dashboardData,
  chartBuckets,
  dueDate,
} from "../src/erp/dashboard-data.ts";

test("small DEMO completion is coherent, persistent, idempotent and preserves existing records", () => {
  const s = populatedState();
  const originals = structuredClone(s.documents);
  assert.equal(completeDashboardDemo(s), true);
  for (const doc of originals)
    assert.deepEqual(
      s.documents.find((d) => d.id === doc.id),
      doc,
    );
  assert.equal(s.documents.filter((d) => d.kind === "OC").length, 4);
  assert.equal(s.documents.filter((d) => d.kind === "NI").length, 3);
  assert.equal(s.documents.filter((d) => d.kind === "CP").length, 4);
  assert.equal(s.quotes.length, 3);
  assert.equal(s.payables.length, 3);
  assert.equal(s.inventoryValuations.length, 3);
  const data = dashboardData(s);
  assert.equal(data.receivables.length, 4);
  assert.equal(data.payables.length, 3);
  assert.ok(data.rotation.value > 0);
  assert.equal(data.rotation.demo, true);
  assert.ok(data.alerts.some((a) => a.type === "Pagar"));
  assert.ok(data.alerts.some((a) => a.type === "Cobrar"));
  for (const a of s.payables)
    assert.ok(
      Math.abs(
        a.balance + a.payments.reduce((sum, p) => sum + p.amount, 0) - a.total,
      ) < 0.001,
    );
  const snapshot = JSON.stringify(s);
  assert.equal(completeDashboardDemo(s), false);
  assert.equal(JSON.stringify(s), snapshot);
  const loaded = JSON.parse(snapshot);
  assert.equal(completeDashboardDemo(loaded), false);
  const real = populatedState();
  real.products.forEach((p) => (p.demo = false));
  const before = JSON.stringify(real);
  assert.equal(completeDashboardDemo(real), false);
  assert.equal(JSON.stringify(real), before);
  const mixed = populatedState();
  mixed.documents.push({
    ...mixed.documents[0],
    id: "USER-RECORD",
    demo: false,
  });
  completeDashboardDemo(mixed);
  assert.equal(mixed.inventoryValuations, undefined);
});

test("dashboard counts invoices once, excludes cancelled and future operations, and uses historical COGS rather than purchases", () => {
  const s = populatedState();
  const d = s.documents.find((d) => d.kind === "CP");
  s.documents = [
    {
      ...d,
      total: 118,
      date: "2026-01-01",
      lines: [{ productId: "PRD-001", quantity: 2, price: 59 }],
    },
    { ...d, id: "cancel", total: 1000, status: "Anulada", date: "2026-01-01" },
    { ...d, id: "future", date: "2027-01-01", total: 1000 },
    { ...d, id: "purchase", kind: "OC", date: "2026-01-01", total: 9999 },
    { ...d, id: "order", kind: "OV", date: "2026-01-01", total: 118 },
  ];
  s.movements = [
    {
      ...s.movements[0],
      documentId: d.id,
      productId: "PRD-001",
      quantity: 2,
      cost: 11.8,
      type: "Salida",
    },
  ];
  s.products[0].cost = 900;
  const data = dashboardData(s, "2026-02-01");
  assert.equal(data.salesTotal, 118);
  assert.equal(data.purchasesTotal, 9999);
  assert.ok(Math.abs(data.profit - 80) < 1e-8);
  assert.ok(Math.abs(data.margin - 80) < 1e-8);
  s.movements = [];
  assert.equal(dashboardData(s, "2026-02-01").profit, null);
});
test("receivable aging uses outstanding balances and contractual due dates, with exact 30/60 day boundaries", () => {
  const s = populatedState();
  const base = s.documents.find((d) => d.kind === "CP");
  const now = "2026-04-01";
  s.documents = [
    ["2026-03-10", 0, 10],
    ["2026-03-01", 1, 20],
    ["2026-01-31", 30, 30],
    ["2026-01-30", 31, 40],
    ["2026-01-01", 60, 50],
    ["2025-12-31", 61, 60],
  ].map(([date, , balance], i) => ({
    ...base,
    id: `CP-${i}`,
    date,
    method: "Crédito 30 días",
    balance,
  }));
  const data = dashboardData(s, now);
  assert.deepEqual(data.aging, [10, 50, 90, 60]);
  assert.equal(data.debt, 210);
  assert.equal(data.overdue, 5);
  assert.equal(data.alerts.length, 5);
  assert.equal(data.alerts[0].doc.id, "CP-5");
  assert.equal(
    dueDate({ ...base, date: "2026-12-20", method: "Crédito 30 días" }),
    "2027-01-19",
  );
  s.documents[0].method = "Crédito";
  assert.equal(dashboardData(s, now).unknownDue, 1);
});
test("critical stock includes equality, counts products once across warehouses and prioritizes shortages", () => {
  const s = populatedState();
  s.products = s.products.slice(0, 2);
  s.warehouses = s.warehouses.slice(0, 2);
  s.stock = {
    "PRD-001": { "ALM-01": 30, "ALM-02": 0 },
    "PRD-002": { "ALM-01": 31, "ALM-02": 29 },
  };
  const data = dashboardData(s);
  assert.equal(data.criticalProducts, 2);
  assert.equal(data.low.length, 3);
  assert.equal(data.low[0].quantity, 0);
  assert.equal(
    data.low.some((r) => r.quantity === 31),
    false,
  );
});
test("chart groups complete calendar weeks, months and quarters across years independently of accumulated KPIs", () => {
  const s = populatedState();
  const base = s.documents.find((d) => d.kind === "CP");
  s.documents = [
    { ...base, date: "2025-12-31", total: 100 },
    { ...base, id: "jan", date: "2026-01-01", total: 200 },
    { ...base, id: "future", date: "2026-01-07", total: 500 },
  ];
  const week = chartBuckets(s, "Semanal", "2026-01-05");
  assert.equal(week.length, 8);
  assert.equal(week.at(-2).start, "2025-12-29");
  assert.equal(week.at(-2).sales, 300);
  const month = chartBuckets(s, "Mensual", "2026-01-05");
  assert.equal(month.at(-2).sales, 100);
  assert.equal(month.at(-1).sales, 200);
  const quarter = chartBuckets(s, "Trimestral", "2026-01-05");
  assert.equal(quarter.at(-2).label, "T4 2025");
  assert.equal(quarter.at(-1).label, "T1 2026");
  assert.equal(quarter.at(-1).sales, 200);
  assert.equal(dashboardData(s, "2026-01-05").salesTotal, 300);
});


test("supplier accounts backfill missing purchases once and preserve recorded payments", async () => {
  const {ensurePurchasePayables} = await import("../src/erp/purchase-payables.ts");
  const s = populatedState();
  const orders = s.documents.filter(d => d.kind === "OC");
  s.payables = undefined;
  assert.equal(ensurePurchasePayables(s), true);
  assert.equal(s.payables.length, orders.length);
  const account = s.payables[0];
  account.balance -= 1;
  account.payments.push({id: "payment", date: account.date, amount: 1, method: "Efectivo", reference: "test"});
  const snapshot = JSON.stringify(s.payables);
  assert.equal(ensurePurchasePayables(s), false);
  assert.equal(JSON.stringify(s.payables), snapshot);
  const credit = orders.find(d => d.method === "Crédito 30 días");
  const due = new Date(`${credit.date}T12:00:00Z`); due.setUTCDate(due.getUTCDate() + 30);
  assert.equal(s.payables.find(p => p.documentId === credit.id).dueDate, due.toISOString().slice(0, 10));
});

test("rotation works without snapshots and includes real sales after old demo valuations", () => {
  const s = populatedState();
  s.inventoryValuations = undefined;
  const data = dashboardData(s);
  assert.ok(data.rotation && Number.isFinite(data.rotation.value));
  assert.ok(data.rotation.value > 0);
  assert.equal(data.rotation.estimated, true);
  s.inventoryValuations = [{date: "2025-01-01", value: 100, includesTax: true, demo: true}, {date: "2025-02-01", value: 100, includesTax: true, demo: true}];
  s.documents.forEach(d => d.demo = false);
  assert.ok(dashboardData(s).rotation.value > 0);
  assert.equal(dashboardData(s).rotation.estimated, true);
  s.documents = []; s.movements = [];
  assert.equal(dashboardData(s).rotation.value, 0);
  s.stock = {};
  assert.equal(dashboardData(s).rotation, null);
});


test("daily chart stops today, includes today's invoices and excludes future documents", async () => {
 const {dailyChartBuckets} = await import("../src/erp/dashboard-data.ts");
 const s = populatedState(), base = s.documents.find(d => d.kind === "CP");
 s.documents = [{...base, date: "2026-10-16", total: 20}, {...base, id: "future", date: "2026-10-26", total: 100}, {...base, id: "previous", date: "2026-09-30", total: 200}];
 const data = dailyChartBuckets(s, "2026-10-16");
 assert.equal(data.length, 16); assert.equal(data.at(-1).end, "2026-10-16");
 assert.equal(data.reduce((sum, d) => sum + d.sales, 0), 20);
 assert.ok(data.every(d => d.start <= "2026-10-16" && d.end <= "2026-10-16"));
 assert.equal(dailyChartBuckets(s, "2026-11-01").length, 1);
 assert.equal(dailyChartBuckets(s, "2028-02-29").length, 29);
});


test("pending invoice summary excludes invoiced, cancelled and future orders", () => {
 const s = populatedState(), base = s.documents.find(d => d.kind === "OV");
 s.documents = [
  {...base, id: "pending", date: "2026-10-16", status: "Pendiente", total: 100},
  {...base, id: "future", date: "2026-10-17", status: "Pendiente", total: 200},
  {...base, id: "invoiced", date: "2026-10-16", status: "Facturada", total: 300},
  {...base, id: "cancelled", date: "2026-10-16", status: "Anulada", total: 400},
 ];
 const data = dashboardData(s, "2026-10-16");
 assert.deepEqual(data.pendingInvoices.map(d => d.id), ["pending"]);
 assert.equal(data.pendingInvoiceTotal, 100);
 s.documents[0].status = "Facturada";
 assert.equal(dashboardData(s, "2026-10-16").pendingInvoiceTotal, 0);
});


test("recent orders contain only today's sales orders", () => {
 const s = populatedState(), base = s.documents.find(d => d.kind === "OV");
 s.documents = [
  {...base, id: "yesterday", date: "2026-10-15"},
  {...base, id: "today", date: "2026-10-16"},
  {...base, id: "tomorrow", date: "2026-10-17"},
  {...base, id: "invoice", kind: "CP", date: "2026-10-16"},
 ];
 assert.deepEqual(dashboardData(s, "2026-10-16").orders.map(d => d.id), ["today"]);
 assert.deepEqual(dashboardData(s, "2026-10-18").orders, []);
});
