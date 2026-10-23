import { test, expect } from "../fixtures/browser-test";
const key = "enterprisecloud-integrated-erp-v1";
test("supplier debt is absent from dashboard and receivables", async ({page}) => {
 await page.goto("/dashboard");
 await expect(page.getByText("Cuentas por pagar", {exact: true})).toHaveCount(0);
 await expect(page.locator(".ed-finance>.ed-card")).toHaveCount(2);
 await page.goto("/estado-cuenta");
 await expect(page.getByText("Cuentas por pagar", {exact: true})).toHaveCount(0);
});

test("executive dashboard has accumulated KPIs, current month, accessible daily tooltips and working exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", {
      name: /Buenos días|Buenas tardes|Buenas noches/,
    }),
  ).toContainText("Administrador");
  await expect(page.locator(".ed-kpi")).toHaveCount(4);
  await expect(page.locator(".ed-finance>.ed-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Hoy", exact: true }),
  ).toHaveCount(0);
  for (const period of ["Semanal", "Mensual", "Trimestral"]) await expect(page.getByRole("button", {name: period, exact: true})).toHaveCount(0);
  const day = await page.evaluate(() => new Date().getDate());
  await expect(page.locator(".chart-period-point")).toHaveCount(day);
  await page.locator(".enterprise-chart rect[tabindex]").last().focus();
  await expect(page.locator(".ed-tooltip")).toBeVisible();
  await expect(page.locator(".ed-tooltip")).toContainText("Ventas");
  await page.keyboard.press("Escape");
  await expect(page.locator(".ed-tooltip")).toBeHidden();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Exportar Excel", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain(
    "enterprisecloud-panel-ejecutivo",
  );
  await expect(page.locator(".ed-finance").nth(0)).toContainText(
    "2 cuentas pendientes",
  );
  await expect(page.locator(".ed-finance").nth(0)).toContainText("Pedidos por facturar");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/executive-dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("recent orders search all records, sort, paginate by five and open details from the actions menu", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    const source = s.documents.find((d: any) => d.kind === "OV");
    for (let i = 0; i < 13; i++)
      s.documents.push({
        ...source,
        id: `TEST-OV-${i}`,
        number: `OV-TEST-${String(i).padStart(3, "0")}`,
        date: new Date().toLocaleDateString("en-CA"),
        total: 100 + i,
      });
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  const table = page.locator(".ed-orders");
  await expect(table.locator("tbody tr")).toHaveCount(5);
  await table.getByRole("button", { name: "Página siguiente" }).click();
  await expect(table.locator(".pagination")).toContainText("6–10");
  await table.getByLabel("Buscar registros").fill("OV-TEST-012");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await table.getByRole("button", { name: "Acciones de OV-TEST-012" }).click();
  await page
    .locator(".ed-native-menu:popover-open")
    .getByRole("button", { name: "Ver detalle", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Detalle de orden de venta",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("OV-TEST-012");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await table.getByLabel("Buscar registros").fill("");
  await table
    .getByRole("columnheader", { name: "Importe total" })
    .getByRole("button")
    .click();
  await expect(
    table.getByRole("columnheader", { name: "Importe total" }),
  ).toHaveAttribute("aria-sort", "ascending");
});
test("alerts use actual balances and minimum stock, open linked records, and mobile layout stays within viewport", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    const cp = s.documents.find((d: any) => d.kind === "CP" && d.balance > 0);
    cp.date = "2020-01-01";
    cp.method = "Crédito 30 días";
    s.stock["PRD-001"]["ALM-01"] = 0;
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await expect(page.locator(".ed-finance").first()).toContainText("vencidas");
  expect(await page.locator(".ed-alerts .ed-account").count()).toBeGreaterThan(
    0,
  );
  await page.locator(".ed-account").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".ed-alerts")
    .getByRole("button", { name: "Bolsa industrial 20 L", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Ficha del producto" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".ed-kpi")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/executive-dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
