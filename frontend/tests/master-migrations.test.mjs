import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/erp/model.ts";
import { ensureMasterData } from "../src/erp/master-migrations.ts";

test("Maestros extiende el estado con los catálogos base y es idempotente", () => {
  const state = initialState();
  assert.equal(ensureMasterData(state), true);
  assert.deepEqual(state.currencies?.map((item) => item.isoCode), ["PEN", "USD", "EUR"]);
  assert.equal(state.taxes?.length, 1);
  assert.equal(state.paymentMethods?.length, 4);
  assert.equal(state.priceLists?.length, 1);
  const snapshot = JSON.stringify(state);
  assert.equal(ensureMasterData(state), false);
  assert.equal(JSON.stringify(state), snapshot);
});

test("Los catálogos nuevos conservan sus relaciones por identificador", () => {
  const state = initialState();
  ensureMasterData(state);
  state.zones?.push({ id: "ZON-TEST", code: "TEST", name: "Zona de prueba", active: true });
  state.sellers?.push({ id: "VEN-TEST", code: "TEST", name: "Vendedor de prueba", commissionPct: 2, monthlyTarget: 1000, zoneId: "ZON-TEST", active: true });
  state.priceListItems?.push({ id: "PLI-TEST", priceListId: "LISTA-BASE", productId: state.products[0]?.id ?? "", minQuantity: 1, price: 10, active: true });
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(restored.sellers[0].zoneId, "ZON-TEST");
  assert.equal(restored.priceListItems[0].priceListId, "LISTA-BASE");
});
