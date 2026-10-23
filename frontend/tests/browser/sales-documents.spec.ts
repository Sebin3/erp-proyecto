import { populatedState } from "../fixtures/populated-state";
import { test, expect } from "../fixtures/browser-test";
import {
  
  createDocument,
  saveQuote,
  changeQuote,
  today,
} from "../../src/erp/model";
const key = "enterprisecloud-integrated-erp-v1";
async function prepare(page: any) {
  const s = populatedState(),
    draft = {
      kind: "OV" as const,
      date: today(),
      partyId: s.customers[0].id,
      warehouseId: s.warehouses[0].id,
      method: "Crédito 30 días",
      voucher: "Factura electrónica",
      lines: [{ productId: s.products[0].id, quantity: 3, price: 20 }],
      discount: 2,
      freight: 5,
      notes: "Condiciones acordadas: entregar en horario de oficina.",
    };
  const direct = createDocument(s, draft);
  const quote = saveQuote(s, { ...draft, validity: 20 });
  changeQuote(s, quote.id, "send");
  changeQuote(s, quote.id, "accept");
  await page.goto("/orden-venta");
  await page.evaluate(
    ({ key, s }: any) => localStorage.setItem(key, JSON.stringify(s)),
    { key, s },
  );
  await page.reload();
  return {
    s,
    direct,
    quote,
    order: s.documents.find((d) => d.id === quote.orderId)!,
  };
}
for (const mobile of [false, true])
  test(`sales details, invoice and persistence ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    else await page.setViewportSize({ width: 1440, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const { s, direct, quote, order } = await prepare(page);
    let row = page.locator("tbody tr").filter({ hasText: direct.number });
    await row.getByRole("button", { name: "Ver", exact: true }).click();
    let detail = page.getByRole("dialog", {
      name: "Detalle de orden de venta",
      exact: true,
    });
    await expect(detail).toContainText(s.customers[0].taxId);
    await expect(
      detail.getByRole("button", { name: new RegExp("Cotización COT") }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();
    row = page.locator("tbody tr").filter({ hasText: order.number });
    await row.getByRole("button", { name: "Ver", exact: true }).click();
    detail = page.getByRole("dialog", {
      name: "Detalle de orden de venta",
      exact: true,
    });
    await expect(detail).toContainText(order.number);
    await detail
      .getByRole("button", { name: `Cotización ${quote.number}`, exact: true })
      .click();
    const source = page.getByRole("dialog", {
      name: "Detalle de cotización",
      exact: true,
    });
    await expect(source).toContainText(quote.number);
    await expect(source).toContainText(order.notes);
    await page.keyboard.press("Escape");
    await expect(source).toBeHidden();
    await page.screenshot({
      path: `test-results/sales-detail-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: false,
      animations: "disabled",
    });
    await detail.getByRole("tab", { name: "Productos", exact: true }).click();
    await expect(
      detail
        .getByRole("cell", { name: s.products[0].name, exact: false })
        .first(),
    ).toBeVisible();
    await detail
      .getByRole("tab", { name: "Resumen económico", exact: true })
      .click();
    await expect(detail.locator(".sales-total>strong")).toContainText("63");
    await page.screenshot({
      path: `test-results/sales-summary-${mobile ? "mobile" : "desktop"}.png`,
      animations: "disabled",
    });
    await detail.getByRole("tab", { name: "Seguimiento", exact: true }).click();
    await expect(detail).toContainText("No hay movimientos vinculados");
    await detail.getByRole("tab", { name: "General", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      detail.getByRole("tab", { name: "Productos", exact: true }),
    ).toBeFocused();
    expect(
      await detail.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(mobile ? 390 : 1120);
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();
    const before = await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k)!);
      return { stock: s.stock, movements: s.movements.length };
    }, key);
    await row.getByRole("button", { name: "Facturar", exact: true }).click();
    const form = page.getByRole("dialog", {
      name: "Facturar venta",
      exact: true,
    });
    await expect(form).toContainText(s.customers[0].name);
    await expect(form.getByLabel("Tipo de comprobante")).toHaveValue(
      "Factura electrónica",
    );
    await expect(form.locator(".sales-total>strong")).toContainText("63");
    await expect(form.locator(".sales-footer")).toBeInViewport();
    await expect(form).toHaveCSS("opacity", "1");
    await expect(page.locator(".modal-backdrop")).toHaveCSS("opacity", "1");
    await page.screenshot({
      path: `test-results/sales-invoice-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: false,
      animations: "disabled",
    });
    await form
      .getByRole("button", { name: "Confirmar facturación", exact: true })
      .click();
    const bill = page.getByRole("dialog", {
      name: "Detalle del comprobante",
      exact: true,
    });
    await expect(bill).toBeVisible();
    await expect(bill).toContainText(order.number);
    await expect(bill).toContainText(quote.number);
    const stored = await page.evaluate(
        (k) => JSON.parse(localStorage.getItem(k)!),
        key,
      ),
      cp = stored.documents.find(
        (d: any) => d.kind === "CP" && d.sourceId === order.id,
      );
    expect(cp.balance).toBe(63);
    expect(stored.movements.length).toBe(before.movements + 1);
    expect(stored.stock[order.lines[0].productId][order.warehouseId]).toBe(
      before.stock[order.lines[0].productId][order.warehouseId] - 3,
    );
    await page.keyboard.press("Escape");
    await expect(bill).toBeHidden();
    await page.reload();
    row = page.locator("tbody tr").filter({ hasText: order.number });
    await expect(row).toContainText("Facturada");
    await expect(
      row.getByRole("button", { name: "Facturar", exact: true }),
    ).toHaveCount(0);
    await page.goto("/facturacion");
    await page
      .locator("tbody tr")
      .filter({ hasText: cp.number })
      .getByRole("button", { name: "Ver", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", {
        name: "Detalle del comprobante",
        exact: true,
      }),
    ).toContainText(cp.number);
    expect(errors).toEqual([]);
  });
test("stock failure leaves invoice modal open and does not write documents", async ({
  page,
}) => {
  const { order } = await prepare(page);
  await page.evaluate(
    ({ key, order }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      s.stock[order.lines[0].productId][order.warehouseId] = 0;
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key, order },
  );
  await page.reload();
  await page
    .locator("tbody tr")
    .filter({ hasText: order.number })
    .getByRole("button", { name: "Facturar", exact: true })
    .click();
  const form = page.getByRole("dialog", {
    name: "Facturar venta",
    exact: true,
  });
  await form.getByRole("button", { name: "Confirmar facturación" }).click();
  await expect(form.getByRole("alert")).toContainText("Stock insuficiente");
  const saved = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(
    saved.documents.some(
      (d: any) => d.kind === "CP" && d.sourceId === order.id,
    ),
  ).toBe(false);
  expect(saved.documents.find((d: any) => d.id === order.id).status).toBe(
    "Pendiente",
  );
});
