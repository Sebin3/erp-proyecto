import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/erp/model.ts";
import {
  queryProducts,
  defaultProductFilters,
  appendProducts,
  productRestriction,
} from "../src/erp/product-query.ts";

test("positive fractional stock remains selectable and zero purchase cost can be edited in the document", () => {
  const state = initialState();
  state.stock["PRD-003"]["ALM-01"] = 0.125;
  const lines = appendProducts(state, [], ["PRD-003"], "ALM-01", "OV");
  assert.equal(lines[0].quantity, 0.125);
  assert.throws(
    () => appendProducts(state, lines, ["PRD-003"], "ALM-01", "OV"),
    /Stock/,
  );
  state.products[2].cost = 0;
  assert.equal(
    appendProducts(state, [], ["PRD-003"], "ALM-01", "OC")[0].price,
    0,
  );
});

test("search and category filter the complete catalog before pagination, ignoring accents", () => {
  const state = initialState();
  state.products = Array.from({ length: 240 }, (_, i) => ({
    ...state.products[0],
    id: `TEST-${i}`,
    name: `Tubería PVC ${i}`,
    sku: `SKU-${i}`,
    barcode: `BAR-${i}`,
    description: `Presión ${i}`,
    category: i % 2 ? "Tuberías" : "Tanques",
    price: 240 - i,
    active: i % 3 !== 0,
  }));
  const query = (f) =>
    queryProducts(state, "ALM-01", { ...defaultProductFilters, ...f }, "OV");
  assert.equal(query({ category: "Tuberías" }).length, 120);
  assert.equal(
    query({ category: "Tuberías", query: "TUBERIA pvc" }).length,
    120,
  );
  assert.equal(query({ category: "Tanques", query: "SKU-239" }).length, 0);
  assert.equal(query({ query: "BAR-239" })[0].id, "TEST-239");
  assert.equal(query({ query: "presion 239" })[0].id, "TEST-239");
  assert.equal(query({ category: "Tuberías", status: "inactive" }).length, 40);
  assert.equal(query({ sort: "price" })[0].price, 1);
  assert.equal(query({ sort: "price-desc" })[0].price, 240);
});
test("stock filters use the selected warehouse and low stock threshold", () => {
  const state = initialState();
  state.stock["PRD-001"]["ALM-01"] = 0;
  state.stock["PRD-002"]["ALM-01"] = 1;
  const query = (availability) =>
    queryProducts(
      state,
      "ALM-01",
      { ...defaultProductFilters, availability },
      "OC",
    );
  assert.deepEqual(
    query("empty").map((p) => p.id),
    ["PRD-001"],
  );
  assert.deepEqual(
    query("low").map((p) => p.id),
    ["PRD-002"],
  );
  assert.equal(query("stock").length, 7);
});
test("selection preserves purchase/quotation zero-stock rules and sales availability", () => {
  const state = initialState();
  state.stock["PRD-001"]["ALM-01"] = 0;
  const product = state.products[0];
  assert.equal(productRestriction(state, product, "ALM-01", "OC", []), "");
  assert.equal(productRestriction(state, product, "ALM-01", "COT", []), "");
  assert.match(productRestriction(state, product, "ALM-01", "OV", []), /Stock/);
  assert.equal(
    appendProducts(state, [], [product.id], "ALM-01", "OC")[0].price,
    product.cost,
  );
  assert.equal(
    appendProducts(state, [], [product.id], "ALM-01", "COT")[0].price,
    product.price,
  );
  product.active = false;
  assert.throws(
    () => appendProducts(state, [], [product.id], "ALM-01", "OC"),
    /inactivo/,
  );
});
test("multiple selection is atomic, keeps negotiated prices, deduplicates IDs and checks existing quantities", () => {
  const state = initialState();
  const lines = [{ productId: "PRD-001", quantity: 2, price: 7.5 }];
  const before = JSON.stringify(state);
  assert.deepEqual(
    appendProducts(state, lines, ["PRD-001", "PRD-001"], "ALM-01", "OV"),
    [{ productId: "PRD-001", quantity: 3, price: 7.5 }],
  );
  assert.equal(lines[0].quantity, 2);
  assert.equal(JSON.stringify(state), before);
  state.stock["PRD-001"]["ALM-01"] = 2;
  assert.throws(
    () => appendProducts(state, lines, ["PRD-002", "PRD-001"], "ALM-01", "OV"),
    /Stock/,
  );
  assert.equal(lines.length, 1);
});
