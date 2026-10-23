import { test, expect, type Page } from "../fixtures/browser-test";
const key = "enterprisecloud-integrated-erp-v1";
test("sales can select fractional stock without exceeding available inventory", async ({
  page,
}) => {
  await page.goto("/orden-venta");
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.stock["PRD-003"]["ALM-01"] = 0.125;
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  const picker = await open(page, "/orden-venta");
  await picker.getByLabel("Buscar productos").fill("PRD-003");
  await picker.getByRole("button", { name: "Agregar", exact: true }).click();
  await picker.getByRole("button", { name: "Agregar seleccionados" }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByLabel("Cantidad PRD-003")).toHaveValue("0.125");
  const again = await openExisting(page);
  await again.getByLabel("Buscar productos").fill("PRD-003");
  await expect(
    again.getByRole("button", { name: "Agregar", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).stock["PRD-003"]["ALM-01"],
      key,
    ),
  ).toBe(0.125);
});
test("maintenance edits persist and are immediately shared by product selectors", async ({
  page,
}) => {
  await page.goto("/mantenimientos");
  await page
    .getByRole("button", { name: "Productos", exact: false })
    .first()
    .click();
  const row = page.getByRole("row").filter({ hasText: "PRD-001" });
  await row.getByRole("button", { name: /^Editar / }).click();
  const editor = page.getByRole("dialog");
  await editor
    .getByLabel("Nombre / razón social", { exact: true })
    .fill("Bolsa industrial actualizada");
  await editor.getByLabel("SKU (opcional)").fill("SKU-ACTUALIZADO");
  await editor.getByLabel("Código de barras (opcional)").fill("TEST-7500123");
  await editor.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(editor).toBeHidden();
  await page.reload();
  const picker = await open(page);
  await picker.getByLabel("Buscar productos").fill("SKU-ACTUALIZADO");
  await expect(picker.locator("tbody tr")).toHaveCount(1);
  await expect(picker.locator("tbody tr")).toContainText(
    "Bolsa industrial actualizada",
  );
  await picker.getByRole("button", { name: /Ver detalles/ }).click();
  await expect(picker.locator(".pd-details")).toContainText("TEST-7500123");
});
async function open(page: Page, path = "/orden-compra") {
  await page.goto(path);
  await page
    .getByRole("button", {
      name: path === "/cotizacion" ? "+ Nueva cotización" : "+ Nueva orden",
    })
    .click();
  await page
    .getByRole("button", { name: "Seleccionar productos", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Seleccionar productos",
    exact: true,
  });
}
test("full-catalog category/search filters, sorting, page sizes and details preserve staged selection", async ({
  page,
}) => {
  await page.goto("/orden-compra");
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    for (let i = 0; i < 232; i++) {
      const id = `DEMO-P-${String(i).padStart(3, "0")}`;
      s.products.push({
        ...s.products[0],
        id,
        name: `Tubería PVC ${String(i).padStart(3, "0")}`,
        category: i % 2 ? "Tuberías" : "Tanques",
        description: `Conducción de agua ${i}`,
        sku: `SKU-${i}`,
        barcode: `BAR-${i}`,
        cost: i + 1,
        price: i + 2,
        active: i % 3 !== 1,
        demo: true,
      });
      s.stock[id] = { "ALM-01": i % 5 === 0 ? 0 : i + 1 };
    }
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  const picker = await open(page);
  await expect(picker.locator("tbody tr")).toHaveCount(10);
  await picker.getByRole("button", { name: "Página siguiente" }).click();
  await picker
    .getByLabel("Categoría", { exact: true })
    .selectOption("Tuberías");
  await expect(picker.locator(".ps-pagination")).toContainText(
    "Página 1 de 12",
  );
  await expect(picker.locator(".ps-result")).toContainText(
    "116 productos encontrados",
  );
  await picker.getByLabel("Buscar productos").fill("TUBERIA pvc");
  await expect(picker.locator(".ps-result")).toContainText(
    "116 productos encontrados",
  );
  await picker.getByLabel("Ordenamiento").selectOption("price-desc");
  await expect(picker.locator("tbody tr").first()).toContainText("DEMO-P-231");
  await picker.getByLabel("Buscar productos").fill("SKU-231");
  await expect(picker.locator("tbody tr")).toHaveCount(1);
  await picker.getByRole("button", { name: "Agregar", exact: true }).click();
  await picker
    .getByRole("button", { name: "Ver detalles de Tubería PVC 231" })
    .click();
  await expect(picker.locator(".pd-details")).toContainText("BAR-231");
  await expect(
    picker.getByRole("button", { name: "Volver a productos" }),
  ).toBeFocused();
  await picker.getByRole("button", { name: "Volver a productos" }).click();
  await expect(picker.getByLabel("Buscar productos")).toHaveValue("SKU-231");
  await expect(
    picker.getByRole("button", { name: "Seleccionado", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await picker.getByRole("button", { name: "Limpiar filtros" }).click();
  await picker.getByLabel("Productos por página").selectOption("50");
  await expect(picker.locator("tbody tr")).toHaveCount(50);
  await picker.getByRole("button", { name: "Agregar seleccionados" }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByLabel("Cantidad DEMO-P-231")).toHaveValue("1");
  const again = await openExisting(page);
  await again.getByLabel("Buscar productos").fill("DEMO-P-231");
  await again.getByRole("button", { name: "Agregar", exact: true }).click();
  await again.getByRole("button", { name: "Agregar seleccionados" }).click();
  await expect(again).toBeHidden();
  await expect(page.getByLabel("Cantidad DEMO-P-231")).toHaveValue("2");
  await expect(page.getByLabel("Cantidad DEMO-P-231")).toHaveCount(1);
});
async function openExisting(page: Page) {
  await page
    .getByRole("button", { name: "Seleccionar productos", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Seleccionar productos",
    exact: true,
  });
}
test("custom checkboxes share selection with row actions and keep confirmation visible while scrolling", async ({
  page,
}) => {
  const picker = await open(page);
  const row = picker.locator("tbody tr").first();
  const checkbox = row.getByRole("checkbox");
  await checkbox.check();
  await expect(row).toHaveClass("ps-selected");
  await expect(
    row.getByRole("button", { name: "Seleccionado", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(picker.locator(".ps-footer")).toContainText("1 seleccionados");
  await row.getByRole("button", { name: "Seleccionado", exact: true }).click();
  await expect(checkbox).not.toBeChecked();
  await expect(
    picker.getByRole("button", { name: "Agregar seleccionados" }),
  ).toBeDisabled();
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await picker.locator(".ps-table-scroll").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  await expect(
    picker.getByRole("button", { name: "Agregar seleccionados" }),
  ).toBeInViewport();
  const dimensions = await row
    .locator(".ps-checkbox input")
    .evaluate((node) => ({
      input: node.getBoundingClientRect().width,
      label: node.parentElement!.getBoundingClientRect().width,
    }));
  expect(dimensions.input).toBe(dimensions.label);
});
test("zero stock is permitted in purchasing and quotations but blocked for sales; inactive products remain consultable", async ({
  page,
}) => {
  await page.goto("/orden-compra");
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    s.stock["PRD-001"]["ALM-01"] = 0;
    s.products[1].active = false;
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  for (const path of ["/orden-compra", "/orden-venta", "/cotizacion"]) {
    const picker = await open(page, path);
    await picker.getByLabel("Disponibilidad").selectOption("empty");
    const add = picker
      .getByRole("row")
      .filter({ hasText: "PRD-001" })
      .getByRole("button", { name: "Agregar", exact: true });
    if (path === "/orden-venta") await expect(add).toBeDisabled();
    else await expect(add).toBeEnabled();
    await picker.getByRole("button", { name: "Limpiar filtros" }).click();
    await picker.getByLabel("Estado", { exact: true }).selectOption("inactive");
    await expect(picker.locator("tbody tr")).toHaveCount(1);
    await expect(
      picker.getByRole("button", { name: "Agregar", exact: true }),
    ).toBeDisabled();
    await picker.getByRole("button", { name: /Ver detalles/ }).click();
    await expect(picker.locator(".pd-details")).toContainText("Inactivo");
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
  }
});
test("mobile selector remains bounded, keyboard Escape restores the editor and cancellation leaves documents unchanged", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const picker = await open(page);
  const before = await page.evaluate((k) => localStorage.getItem(k), key);
  await expect(picker.getByLabel("Buscar productos")).toBeFocused();
  const box = await picker.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(box!.height).toBeLessThanOrEqual(844);
  await picker.getByLabel("Buscar productos").fill("no existe");
  await expect(picker.getByText("No encontramos productos")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Seleccionar productos", exact: true }),
  ).toBeFocused();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(before);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
