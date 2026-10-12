import { test, expect } from "@playwright/test";
const key = "enterprisecloud-integrated-erp-v1";
test("small linked DEMO datasets persist once and supplier debt is consultable in finances", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const before = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(before.documents.filter((d: any) => d.kind === "CP")).toHaveLength(4);
  expect(before.documents.filter((d: any) => d.kind === "OC")).toHaveLength(4);
  expect(before.documents.filter((d: any) => d.kind === "NI")).toHaveLength(3);
  expect(before.quotes).toHaveLength(3);
  expect(before.payables).toHaveLength(3);
  expect(before.inventoryValuations).toHaveLength(3);
  await page.reload();
  const after = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!),
    key,
  );
  expect(after).toEqual(before);
  await page
    .locator(".ed-finance>.ed-card")
    .filter({ hasText: "Cuentas por pagar" })
    .getByRole("link", { name: "Ver detalle" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cuentas por pagar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ver cuenta DEMO-CXP-1", exact: true })
    .click();
  const account = page.getByRole("dialog", { name: /Cuenta por pagar/ });
  await expect(account).toContainText("Pago DEMO simulado");
  await account.getByRole("button", { name: "Ver orden de compra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("executive dashboard has accumulated KPIs, chart-only periods, accessible tooltips and working CSV", async ({
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
  await expect(page.locator(".ed-finance>.ed-card")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Hoy", exact: true }),
  ).toHaveCount(0);
  const totals = await page.locator(".ed-kpis").innerText();
  for (const [period, count] of [
    ["Semanal", 8],
    ["Mensual", 6],
    ["Trimestral", 4],
  ] as const) {
    await page.getByRole("button", { name: period, exact: true }).click();
    await expect(page.locator(".chart-bar-pair")).toHaveCount(count);
    expect(await page.locator(".ed-kpis").innerText()).toBe(totals);
  }
  await page.locator(".enterprise-chart rect[tabindex]").last().focus();
  await expect(page.locator(".ed-tooltip")).toBeVisible();
  await expect(page.locator(".ed-tooltip")).toContainText("Ventas");
  await page.keyboard.press("Escape");
  await expect(page.locator(".ed-tooltip")).toBeHidden();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toContain(
    "EnterpriseCloud-panel",
  );
  await expect(page.locator(".ed-finance").nth(0)).toContainText(
    "3 cuentas pendientes",
  );
  await expect(page.locator(".ed-finance").nth(0)).toContainText("veces");
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
        date: "2026-01-01",
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
    page.getByRole("dialog", { name: "OV-TEST-012", exact: true }),
  ).toBeVisible();
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
