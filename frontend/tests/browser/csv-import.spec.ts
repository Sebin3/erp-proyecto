import { test, expect } from "@playwright/test";

const key = "enterprisecloud-integrated-erp-v1";
test("legacy browser data is cleaned once and keeps the three protected settings", async ({ page }) => {
  await page.goto("/dashboard");
  await page.evaluate((storageKey) => {
    const state = JSON.parse(localStorage.getItem(storageKey)!);
    delete state.businessCleanupVersion;
    state.categories.push("Personalizada");
    state.warehouses[0].branch = "Sucursal propia";
    state.settings.company = "Mi Empresa";
    state.products.push({ id: "PRD-OLD", name: "Prueba" });
    state.customers.push({ id: "CLI-OLD", name: "Prueba" });
    state.documents.push({ id: "DOC-OLD", kind: "CP" });
    state.stock["PRD-OLD"] = { "ALM-01": 10 };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, key);
  await page.reload();
  const state = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(state.categories).toContain("Personalizada");
  expect(state.warehouses[0].branch).toBe("Sucursal propia");
  expect(state.settings.company).toBe("Mi Empresa");
  for (const field of ["customers", "suppliers", "products", "documents", "quotes", "movements", "audit"])
    expect(state[field]).toEqual([]);
  expect(state.stock).toEqual({});
  await page.reload();
  expect((await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key)).businessCleanupVersion).toBe(1);
});

test("CSV modal imports into shared catalog, updates duplicates and syncs another tab", async ({ page, context }) => {
  await page.goto("/mantenimientos");
  const other = await context.newPage();
  await other.goto("/mantenimientos");
  await page.getByRole("tab", { name: "Clientes" }).click();
  await page.getByRole("button", { name: "Importar CSV" }).click();
  let dialog = page.getByRole("dialog", { name: /Importar clientes/ });
  await dialog.getByLabel("Seleccionar CSV de clientes").setInputFiles({ name: "clientes.csv", mimeType: "text/csv", buffer: Buffer.from("\uFEFFname,taxId,credit\nComercial Ñawi,12345678,500", "utf8") });
  await expect(dialog.locator(".csv-stats")).toContainText("1");
  await dialog.getByRole("button", { name: "Importar 1 registro" }).click();
  await expect(dialog.getByText("Importación finalizada")).toBeVisible();
  await dialog.getByRole("button", { name: "Finalizar" }).click();
  await expect(other.getByText("Comercial Ñawi")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Comercial Ñawi")).toBeVisible();
  await page.getByRole("tab", { name: "Productos" }).click();
  await page.getByRole("button", { name: "Importar CSV" }).click();
  dialog = page.getByRole("dialog", { name: /Importar productos/ });
  const productCsv = "name,category,unit,cost,price,minimum,sku\nTubería PVC,PVC,UND,10,15,2,TUB-01";
  await dialog.getByLabel("Seleccionar CSV de productos").setInputFiles({ name: "productos.csv", mimeType: "text/csv", buffer: Buffer.from(productCsv) });
  await dialog.getByRole("button", { name: "Importar 1 registro" }).click();
  await dialog.getByRole("button", { name: "Finalizar" }).click();
  await expect(page.getByText("Tubería PVC")).toBeVisible();
  const before = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!).products[0].id, key);
  await page.getByRole("button", { name: "Importar CSV" }).click();
  dialog = page.getByRole("dialog", { name: /Importar productos/ });
  await dialog.getByLabel("Seleccionar CSV de productos").setInputFiles({ name: "actualizacion.csv", mimeType: "text/csv", buffer: Buffer.from(productCsv.replace(",10,15,", ",10,25,")) });
  await expect(dialog.locator(".csv-duplicate")).toContainText("Se omitirá");
  await dialog.getByRole("combobox").selectOption("update");
  await dialog.getByRole("button", { name: "Importar 1 registro" }).click();
  await dialog.getByRole("button", { name: "Finalizar" }).click();
  const state = await page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey)!), key);
  expect(state.products).toHaveLength(1);
  expect(state.products[0].id).toBe(before);
  expect(state.products[0].price).toBe(25);
  expect(state.stock[before]["ALM-01"]).toBe(0);
  expect(state.movements).toEqual([]);
});
