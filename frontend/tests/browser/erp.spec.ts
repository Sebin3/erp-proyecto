import { test, expect } from "@playwright/test";
const key = "enterprisecloud-integrated-erp-v1";
test("all modules load without runtime errors and retain the existing palette", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [path, title] of [
    ["dashboard", "Administrador"],
    ["orden-compra", "Orden de compra"],
    ["ingreso-kardex", "Ingreso al Kardex"],
    ["cotizacion", "Cotización"],
    ["orden-venta", "Orden de venta"],
    ["facturacion", "Facturación"],
    ["estado-cuenta", "Estado de cuenta"],
    ["movimiento-kardex", "Movimiento de Kardex"],
    ["stock-productos", "Stock de productos"],
    ["reportes", "Reportes"],
    ["mantenimientos", "Mantenimientos"],
  ]) {
    await page.goto("/" + path);
    await expect(
      page
        .getByRole("heading", {
          name: path === "dashboard" ? /Administrador/ : title,
          exact: path !== "dashboard",
        })
        .first(),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg")
        .trim(),
    ),
  ).toBe("#ffffff");
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
});
test("buy, partially receive, complete reception and persist across reload", async ({
  page,
}) => {
  await page.goto("/orden-compra");
  await page.getByRole("button", { name: "+ Nueva orden" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Proveedor", exact: true }).click();
  const selector = page.getByRole("dialog", {
    name: "Seleccionar proveedor",
    exact: true,
  });
  await selector
    .getByRole("button", { name: /^Ver proveedor/ })
    .first()
    .click();
  await selector
    .getByRole("button", { name: "Seleccionar proveedor", exact: true })
    .click();
  await dialog
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
  await dialog.getByLabel("Cantidad PRD-001").fill("10");
  await dialog.getByRole("button", { name: "Guardar orden" }).click();
  await expect(dialog).not.toBeVisible();
  const row = page.locator("tbody tr").first();
  const number = await row.locator("td").first().innerText();
  await row.getByRole("button", { name: "Recibir", exact: true }).click();
  await page.getByLabel("Recibir PRD-001").fill("4");
  await page.getByRole("button", { name: "Confirmar recibir compra" }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: number }),
  ).toContainText("Recibida parcial");
  await page
    .locator("tbody tr")
    .filter({ hasText: number })
    .getByRole("button", { name: "Recibir", exact: true })
    .click();
  await expect(page.getByLabel("Recibir PRD-001")).toHaveValue("6");
  await page.getByRole("button", { name: "Confirmar recibir compra" }).click();
  await page.reload();
  await expect(
    page.locator("tbody tr").filter({ hasText: number }),
  ).toContainText("Recibida");
  const stored = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(
    stored.documents.filter(
      (d: any) =>
        d.kind === "NI" &&
        d.sourceId ===
          stored.documents.find((d: any) => d.number === number).id,
    ),
  ).toHaveLength(2);
});
test("quotation acceptance, invoice, partial payment and full settlement stay linked", async ({
  page,
}) => {
  await page.goto("/cotizacion");
  await page.getByRole("button", { name: "+ Nueva cotización" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ index: 1 });
  await dialog.getByLabel("Forma de pago").selectOption("Crédito 30 días");
  await dialog
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
  await dialog.getByLabel("Cantidad PRD-001").fill("5");
  await dialog.getByRole("button", { name: "Guardar cotización" }).click();
  let row = page.locator("tbody tr").first();
  const quote = await row.locator("td").first().innerText();
  await row.getByRole("button", { name: "Enviar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await row.getByRole("button", { name: "Aceptó", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(row).toContainText("Aceptada");
  let saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  const order = saved.documents.find(
    (d: any) =>
      d.id === saved.quotes.find((q: any) => q.number === quote).orderId,
  );
  await page.goto("/orden-venta");
  await page
    .locator("tbody tr")
    .filter({ hasText: order.number })
    .getByRole("button", { name: "Facturar", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar facturar venta" }).click();
  saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
  const cp = saved.documents.find(
    (d: any) => d.kind === "CP" && d.sourceId === order.id,
  );
  expect(cp.balance).toBe(10);
  await page.goto("/estado-cuenta");
  row = page.locator("tbody tr").filter({ hasText: cp.number });
  await row.getByRole("button", { name: "Cobrar", exact: true }).click();
  await page.getByLabel("Importe a cobrar").fill("4");
  await page.getByLabel("Referencia de operación").fill("PAY-1");
  await page.getByRole("button", { name: "Confirmar registrar cobro" }).click();
  await expect(row).toContainText("Pago parcial");
  await row.getByRole("button", { name: "Cobrar", exact: true }).click();
  await page.getByLabel("Referencia de operación").fill("PAY-2");
  await page.getByRole("button", { name: "Confirmar registrar cobro" }).click();
  await expect(row).toContainText("Pagada");
  await page.reload();
  await expect(
    page.locator("tbody tr").filter({ hasText: cp.number }),
  ).toContainText("Pagada");
  await page.goto("/cotizacion");
  await expect(
    page.locator("tbody tr").filter({ hasText: quote }),
  ).toContainText("Procesada");
});
test("kardex filters, original document, CSV download and report work", async ({
  page,
}) => {
  await page.goto("/movimiento-kardex");
  await page
    .getByLabel("Filtrar estado", { exact: true })
    .selectOption("Entrada");
  await expect(page.locator("tbody tr").first()).toContainText("Compra");
  await page
    .getByRole("button", { name: "Ver documento", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar", exact: true })
    .last()
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toContain("movimiento-kardex");
  await page.goto("/reportes");
  await page
    .getByRole("button", { name: "Movimientos de Kardex", exact: true })
    .click();
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
});
test("shared supplier catalog is available in purchase creation", async ({
  page,
}) => {
  await page.goto("/mantenimientos");
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await page.getByRole("button", { name: "Nuevo proveedor" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Razón social", { exact: true })
    .fill("Proveedor de prueba");
  await dialog.getByLabel("RUC", { exact: true }).fill("20600000013");
  await dialog
    .getByRole("button", { name: "Guardar proveedor", exact: true })
    .click();
  await page.goto("/orden-compra");
  await page.getByRole("button", { name: "+ Nueva orden" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Proveedor", exact: true })
    .click();
  const selector = page.getByRole("dialog", {
    name: "Seleccionar proveedor",
    exact: true,
  });
  await selector.getByLabel("Buscar proveedores").fill("Proveedor de prueba");
  await expect(
    selector.getByRole("button", {
      name: "Ver proveedor Proveedor de prueba",
      exact: true,
    }),
  ).toBeVisible();
});
test("mobile navigation, search shortcut, dark mode and responsive layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Abrir o cerrar menú" }).click();
  await page
    .getByRole("link", { name: "Movimiento de Kardex", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Movimiento de Kardex", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByLabel("Buscar módulos o documentos").fill("Stock");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Stock de productos/ })
    .click();
  await page.getByRole("button", { name: "Abrir o cerrar menú" }).click();
  await page.getByRole("button", { name: "Cambiar tema" }).click();
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
  ).toBe("dark");
  await page.getByRole("button", { name: "Cerrar menú", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator(".integrated-sidebar")
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
