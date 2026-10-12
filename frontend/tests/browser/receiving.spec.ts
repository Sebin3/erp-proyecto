import { test, expect, type Page } from "@playwright/test";
const key = "enterprisecloud-integrated-erp-v1";
async function seed(page: Page) {
  await page.goto("/ingreso-kardex");
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.documents.unshift({
      ...state.documents.find((d: any) => d.kind === "OC"),
      id: "RECEPTION-TEST",
      number: "OC-RECEPTION-TEST",
      status: "Pendiente",
      date: "2026-10-10",
      warehouseId: "ALM-01",
      lines: [{ productId: "PRD-001", quantity: 10, price: 2 }],
      received: {},
      total: 20,
    });
    localStorage.setItem(key, JSON.stringify(state));
  }, key);
  await page.reload();
}
test("receiving module records partial and full receipts with stock, pending quantities, notes and Kardex synchronized", async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByText("Resumen financiero")).toHaveCount(0);
  await expect(page.getByText("Datos de tu operación")).toHaveCount(0);
  await expect(page.locator(".rc-metrics .metric")).toHaveCount(4);
  const order = page
    .locator(".rc-order")
    .filter({ hasText: "OC-RECEPTION-TEST" });
  const before = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).stock["PRD-001"]["ALM-02"],
    key,
  );
  await order.getByRole("button", { name: "Registrar ingreso" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Recibir compra · OC-RECEPTION-TEST",
  });
  await dialog.getByLabel("Almacén de recepción").selectOption("ALM-02");
  await dialog.getByLabel("Recibir PRD-001").fill("11");
  await expect(
    dialog.getByRole("button", { name: "Confirmar recibir compra" }),
  ).toBeDisabled();
  await dialog.getByLabel("Recibir PRD-001").fill("4");
  await expect(dialog.locator(".rc-receipt-summary")).toContainText(
    "Recepción parcial",
  );
  await dialog
    .getByRole("button", { name: "Confirmar recibir compra" })
    .click();
  await expect(dialog).toBeHidden();
  await expect(order).toContainText("Recibida parcial");
  await expect(order.locator(".rc-order-products")).toContainText("6");
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  const note = stored.documents.find(
    (d: any) => d.kind === "NI" && d.sourceId === "RECEPTION-TEST",
  );
  expect(stored.stock["PRD-001"]["ALM-02"]).toBe(before + 4);
  expect(
    stored.movements.filter((m: any) => m.documentId === note.id),
  ).toHaveLength(1);
  await page.getByLabel("Buscar registros").fill("OC-RECEPTION-TEST");
  await expect(page.locator(".records tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: `Ver nota ${note.number}` }).click();
  const detail = page.getByRole("dialog", { name: note.number, exact: true });
  await expect(detail).toContainText("OC-RECEPTION-TEST");
  await expect(detail).toContainText("Costo unitario");
  await expect(detail).toContainText("4");
  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await order.getByRole("button", { name: "Registrar ingreso" }).click();
  await expect(dialog.getByLabel("Recibir PRD-001")).toHaveValue("6");
  await expect(dialog.locator(".rc-receipt-summary")).toContainText(
    "Recepción completa",
  );
  await dialog
    .getByRole("button", { name: "Confirmar recibir compra" })
    .click();
  await expect(order).toHaveCount(0);
  await expect(page.locator(".records tbody tr")).toHaveCount(2);
  await page.reload();
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    key,
  );
  expect(
    after.documents.find((d: any) => d.id === "RECEPTION-TEST").received[
      "PRD-001"
    ],
  ).toBe(10);
  expect(
    after.documents.filter(
      (d: any) => d.kind === "NI" && d.sourceId === "RECEPTION-TEST",
    ),
  ).toHaveLength(2);
});
test("mobile receipts and registration form remain within the viewport and note filters work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Filtrar por fecha").fill("1900-01-01");
  await expect(page.getByText("Sin resultados", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.locator(".records tbody tr").first()).toBeVisible();
  await page
    .locator(".rc-order")
    .filter({ hasText: "OC-RECEPTION-TEST" })
    .getByRole("button", { name: "Registrar ingreso" })
    .click();
  const dialog = page.getByRole("dialog");
  expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(390);
  expect(
    await dialog
      .locator(".rc-receipt-table")
      .evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await dialog.getByLabel("Recibir PRD-001").fill("0");
  await expect(
    dialog.getByRole("button", { name: "Confirmar recibir compra" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Completar pendientes" }).click();
  await expect(dialog.getByLabel("Recibir PRD-001")).toHaveValue("10");
  const footer = await dialog.locator(".modal-actions").boundingBox();
  const bounds = await dialog.boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(
    bounds!.y + bounds!.height,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
