import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/erp/model.ts";
import { seedIntegratedDemoData } from "../src/erp/integrated-demo-data.ts";

test("carga cinco escenarios conectados para Dashboard, operaciones e inventario", () => {
  const state = initialState();
  const first = seedIntegratedDemoData(state);
  const second = seedIntegratedDemoData(state);

  assert.equal(first.created, true);
  assert.equal(first.sets, 5);
  assert.equal(state.products.filter((item) => item.id.startsWith("PRD-DEMO-")).length, 5);
  assert.equal(state.customers.filter((item) => item.id.startsWith("CLI-DEMO-")).length, 5);
  assert.equal(state.suppliers.filter((item) => item.id.startsWith("PRO-DEMO-")).length, 5);
  assert.equal(state.documents.filter((item) => item.kind === "OC").length, 5);
  assert.equal(state.documents.filter((item) => item.kind === "CP").length, 5);
  assert.equal(state.movements.filter((item) => item.type === "Entrada").length, 5);
  assert.equal(state.movements.filter((item) => item.type === "Salida").length, 5);
  assert.equal(state.payables, undefined);
  assert.equal(state.products.filter((item) => item.id.startsWith("PRD-DEMO-")).every((item) => item.brandId && item.categoryId && item.unitId), true);
  assert.equal(state.customers.filter((item) => item.id.startsWith("CLI-DEMO-")).every((item) => item.zoneId && item.sellerId && item.priceListId), true);
  assert.equal(second.created, false);
  assert.equal(state.documents.length, 20);
});
