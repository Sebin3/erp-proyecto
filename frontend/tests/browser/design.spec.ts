import { test, expect } from "@playwright/test";
const key = "enterprisecloud-integrated-erp-v1";

test("white surfaces, outlined navigation and collapsible groups preserve every module", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.locator(".menu-link svg")).toHaveCount(11);
  await expect(page.locator(".menu-link.active")).toHaveCSS(
    "background-color",
    "rgb(243, 244, 246)",
  );
  await expect(page.locator(".menu-link.active")).toHaveCSS(
    "border-top-color",
    "rgb(218, 221, 227)",
  );
  const stored = await page.evaluate((k) => localStorage.getItem(k), key);
  const group = page.getByRole("button", {
    name: "Abastecimiento",
    exact: true,
  });
  await group.click();
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("link", { name: "Órdenes de compra", exact: true }),
  ).not.toBeVisible();
  await group.click();
  await expect(
    page.getByRole("link", { name: "Órdenes de compra", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Colapsar menú" }).click();
  await expect(
    page.getByRole("button", { name: "Expandir menú" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expandir menú" }).click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(stored);
});

test("chart modes, keyboard tooltips and purchase modal leave business data intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto("/dashboard");
  await expect(page.locator(".enterprise-chart")).toBeVisible();
  const stored = await page.evaluate((k) => localStorage.getItem(k), key);
  await page.screenshot({
    path: "test-results/premium-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Semanal", exact: true }).click();
  await expect(page.locator(".chart-bar-pair")).toHaveCount(8);
  await page.locator(".enterprise-chart rect[tabindex]").first().focus();
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await expect(page.locator(".chart-tooltip")).toContainText("Ventas");
  await page.getByRole("button", { name: "Trimestral", exact: true }).click();
  await expect(page.locator(".chart-bar-pair")).toHaveCount(4);
  await page
    .getByRole("link", { name: "Órdenes de compra", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Nueva orden" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".modal-content")).toHaveCSS("overflow-y", "auto");
  await page.screenshot({
    path: "test-results/premium-purchase-modal.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(stored);
});

test("reduced motion is respected and modal focus stays within the dialog", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/orden-compra");
  await page.getByRole("button", { name: "+ Nueva orden" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((el) =>
      parseFloat(getComputedStyle(el).animationDuration),
    ),
  ).toBeLessThan(0.01);
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
