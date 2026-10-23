import { populatedState } from "../fixtures/populated-state";
import { test, expect } from "../fixtures/browser-test";
import {  createDocument, today } from "../../src/erp/model";
import { clearOctober16Operations } from "../fixtures/operation-cleanup";
for (const method of ["Contado", "Transferencia bancaria", "Crédito 30 días"]) {
 test(`invoice can be collected: ${method}`, async ({ page }) => {
  const state = populatedState(); clearOctober16Operations(state); state.demoDashboardVersion = 1;
  const order = createDocument(state, {kind: "OV", date: today(), partyId: state.customers[0].id, warehouseId: state.warehouses[0].id, method, voucher: "Factura electrónica", lines: [{productId: state.products[0].id, quantity: 1, price: 20}], discount: 0, freight: 0, notes: ""});
  await page.goto("/orden-venta");
  await page.evaluate(s => localStorage.setItem("enterprisecloud-integrated-erp-v1", JSON.stringify(s)), state);
  await page.reload();
  await page.locator("tbody tr").filter({hasText: order.number}).getByRole("button", {name: "Facturar", exact: true}).click();
  await page.getByRole("button", {name: "Confirmar facturación"}).click();
  await expect(page.getByRole("dialog", {name: "Facturar venta", exact: true})).toBeHidden();
  const bill = await page.evaluate(id => JSON.parse(localStorage.getItem("enterprisecloud-integrated-erp-v1")!).documents.find((d: any) => d.kind === "CP" && d.sourceId === id), order.id);
  expect(bill.balance).toBe(20);
  await page.goto("/estado-cuenta");
  let row = page.locator("tbody tr").filter({hasText: bill.number});
  await expect(row).toContainText(method);
  await row.getByRole("button", {name: "Cobrar", exact: true}).click();
  await page.getByRole("dialog").getByRole("button", {name: "Confirmar registrar cobro", exact: true}).click();
  await page.reload();
  row = page.locator("tbody tr").filter({hasText: bill.number});
  await expect(row).toContainText("Pagada");
  await expect(row.getByRole("button", {name: "Cobrar", exact: true})).toHaveCount(0);
 });
}
