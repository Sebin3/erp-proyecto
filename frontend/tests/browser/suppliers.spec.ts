import { test, expect, type Page } from "../fixtures/browser-test";
const key = "enterprisecloud-integrated-erp-v1";
async function seed(page: Page) {
  await page.goto("/orden-compra");
  await page.evaluate((k) => {
    const state = JSON.parse(localStorage.getItem(k)!);
    state.suppliers[0] = {
      ...state.suppliers[0],
      tradeName: "Marca Técnica de prueba",
      category: "Materia prima",
      supplierType: "Fabricante",
      paymentTerms: "Crédito 30 días",
      internalNotes: "Nota exclusiva de prueba",
    };
    state.suppliers[1].active = false;
    localStorage.setItem(k, JSON.stringify(state));
  }, key);
  await page.reload();
}
async function open(page: Page) {
  await page.getByRole("button", { name: "+ Nueva orden" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Proveedor", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Seleccionar proveedor",
    exact: true,
  });
}
test("search, combined filters, detailed review and selection retain supplier identity", async ({
  page,
}) => {
  await seed(page);
  const selector = await open(page);
  await expect(selector.getByLabel("Buscar proveedores")).toBeFocused();
  await selector.getByLabel("Buscar proveedores").fill("tecnica");
  await selector
    .getByLabel("Categoría del proveedor")
    .selectOption("Materia prima");
  await selector.getByLabel("Tipo de proveedor").selectOption("Fabricante");
  await selector
    .getByLabel("Estado del proveedor", { exact: true })
    .selectOption("true");
  await expect(selector.locator(".supplier-card")).toHaveCount(1);
  await selector.getByRole("button", { name: /^Ver proveedor/ }).click();
  await expect(
    selector.getByRole("button", { name: "Cerrar", exact: true }),
  ).toBeFocused();
  await expect(selector.getByRole("tabpanel")).toContainText("PRO-1");
  await expect(selector.getByRole("tabpanel")).toContainText("Materia prima");
  await selector.getByRole("tab", { name: "Comercial" }).click();
  await expect(selector.getByRole("tabpanel")).toContainText("Crédito 30 días");
  await page.keyboard.press("ArrowRight");
  await expect(selector.getByRole("tab", { name: "Historial" })).toBeFocused();
  await expect(selector.getByRole("tabpanel")).toContainText(
    "Nota exclusiva de prueba",
  );
  await selector.getByRole("button", { name: "Volver a proveedores" }).click();
  await expect(selector.getByLabel("Buscar proveedores")).toHaveValue(
    "tecnica",
  );
  await selector.getByRole("button", { name: /^Ver proveedor/ }).click();
  await selector
    .getByRole("button", { name: "Seleccionar proveedor", exact: true })
    .click();
  await expect(selector).not.toBeVisible();
  const form = page.getByRole("dialog", { name: "Nueva orden de compra" });
  await expect(form.locator(".selected-supplier-summary")).toContainText(
    "PRO-1",
  );
  await form
    .getByRole("button", { name: "Seleccionar productos", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Seleccionar productos",
    exact: true,
  });
  await picker
    .getByRole("row")
    .filter({ hasText: "PRD-001" })
    .getByRole("button", { name: "Agregar", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "Agregar seleccionados", exact: true })
    .click();
  await picker.waitFor({ state: "hidden" });
  await form.getByRole("button", { name: "Guardar orden" }).click();
  const id = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).documents[0].partyId,
    key,
  );
  expect(id).toBe("PRO-1");
});
test("nested Escape restores focus without closing or submitting the purchase form", async ({
  page,
}) => {
  await seed(page);
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  const selector = await open(page);
  await selector.getByLabel("Buscar proveedores").fill("sin coincidencias");
  await expect(
    selector.getByRole("heading", { name: "Sin coincidencias" }),
  ).toBeVisible();
  await selector.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(selector.locator(".supplier-card")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(selector).not.toBeVisible();
  const form = page.getByRole("dialog", { name: "Nueva orden de compra" });
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Proveedor", exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  await page.keyboard.press("Escape");
  await expect(form).not.toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});
test("inactive suppliers remain consultable but cannot be chosen for new purchases", async ({
  page,
}) => {
  await seed(page);
  const selector = await open(page);
  await selector
    .getByLabel("Estado del proveedor", { exact: true })
    .selectOption("false");
  await expect(selector.locator(".supplier-card")).toHaveCount(1);
  await selector.getByRole("button", { name: /^Ver proveedor/ }).click();
  await expect(
    selector.getByRole("button", {
      name: "Seleccionar proveedor",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(selector).toContainText(
    "Los proveedores inactivos solo pueden consultarse",
  );
  await page.goto("/reportes");
  await page
    .getByRole("button", { name: "Compras por proveedor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Proveedor del reporte", exact: true })
    .click();
  const reportSelector = page.getByRole("dialog", {
    name: "Seleccionar proveedor",
    exact: true,
  });
  await reportSelector.getByLabel("Buscar proveedores").fill("PRO-2");
  await reportSelector.getByRole("button", { name: /^Ver proveedor/ }).click();
  await expect(
    reportSelector.getByRole("button", {
      name: "Seleccionar proveedor",
      exact: true,
    }),
  ).toBeEnabled();
  await reportSelector
    .getByRole("button", { name: "Seleccionar proveedor", exact: true })
    .click();
  await expect(page.locator(".selected-supplier-summary")).toContainText(
    "PRO-2",
  );
  await page.getByRole("button", { name: "Quitar filtro" }).click();
  await expect(
    page.getByRole("button", { name: "Proveedor del reporte", exact: true }),
  ).toContainText("Todos los proveedores");
});
test("supplier catalog uses the administration table and persists metadata without changing identifiers", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/mantenimientos");
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await page.getByLabel("Buscar registros").fill("PRO-1");
  await page
    .locator("tbody tr")
    .getByRole("button", { name: /^Editar / })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Condición de pago", { exact: false })
    .fill("Contado");
  await page
    .getByRole("dialog")
    .getByLabel("Categoría del proveedor")
    .fill("Insumos");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .locator("tbody tr")
    .getByRole("button", { name: /^Ver detalles / })
    .click();
  const details = page.getByRole("dialog", { name: "Ficha del proveedor" });
  await expect(details.getByRole("tabpanel")).toContainText("Insumos");
  await details.getByRole("tab", { name: "Comercial" }).click();
  await expect(details.getByRole("tabpanel")).toContainText("Contado");
  const supplier = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).suppliers[0],
    key,
  );
  expect(supplier.id).toBe("PRO-1");
  expect(supplier.tradeName).toBe("Marca Técnica de prueba");
});
test("mobile selector scrolls internally, keeps actions visible and supports keyboard cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const selector = await open(page);
  const first = selector
    .getByRole("button", { name: /^Ver proveedor/ })
    .first();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    selector.getByRole("button", { name: /^Ver proveedor/ }).nth(1),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    selector.getByRole("button", {
      name: "Seleccionar proveedor",
      exact: true,
    }),
  ).toBeInViewport();
  const dimensions = await selector.evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    scroll: node.scrollWidth,
    client: node.clientWidth,
    bottom: node.getBoundingClientRect().bottom,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(390);
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  expect(dimensions.bottom).toBeLessThanOrEqual(844);
  await page.screenshot({
    path: "test-results/supplier-mobile.png",
    fullPage: true,
  });
});
test("documents and global search open the same supplier profile without changing data", async ({
  page,
}) => {
  await seed(page);
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: "Ver", exact: true })
    .click();
  const document = page.getByRole("dialog");
  await document.locator(".supplier-inline").click();
  const profile = page.getByRole("dialog", {
    name: "Ficha del proveedor",
    exact: true,
  });
  await expect(
    profile.getByRole("button", { name: "Cerrar", exact: true }),
  ).toBeFocused();
  expect(await page.locator("#root").evaluate((element) => element.inert)).toBe(
    true,
  );
  await expect(profile.getByRole("tabpanel")).toContainText("Código interno");
  await page.keyboard.press("Escape");
  await expect(profile).not.toBeVisible();
  await expect(document).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(document).not.toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Buscar en el sistema" });
  await search.getByLabel("Buscar módulos o documentos").fill("tecnica");
  await search.locator(".supplier-inline").click();
  await expect(profile.getByRole("tabpanel")).toContainText(
    "Marca Técnica de prueba",
  );
  await page.keyboard.press("Escape");
  await expect(profile).not.toBeVisible();
  await expect(search).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
});
