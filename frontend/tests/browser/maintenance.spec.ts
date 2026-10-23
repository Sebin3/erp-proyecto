import { test, expect, type Page } from "../fixtures/browser-test";
const key = "enterprisecloud-integrated-erp-v1";
test("supplier visual primitives match the supplied HTML reference", async ({
  page,
  context,
}) => {
  const reference = await context.newPage();
  await reference.goto("/proveedor-premium.html");
  const properties = [
    [
      ".modal",
      ".premium-profile-modal",
      ["width", "borderRadius", "borderTopColor"],
    ],
    [
      ".top",
      ".pp-top",
      ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
    ],
    [
      ".avatar",
      ".pp-avatar",
      ["width", "height", "borderRadius", "fontSize", "backgroundColor"],
    ],
    [".stats", ".pp-stats", ["columnGap", "rowGap", "marginTop"]],
    [
      ".stat",
      ".pp-stat",
      ["paddingTop", "paddingRight", "borderRadius", "backgroundColor"],
    ],
    [
      ".stat-value",
      ".pp-stat-value",
      ["fontSize", "fontWeight", "lineHeight", "marginTop"],
    ],
    [
      ".tabs",
      ".pp-tabs",
      ["paddingTop", "paddingRight", "paddingBottom", "borderTopColor"],
    ],
    [
      ".tab.active",
      ".pp-tab.active",
      [
        "paddingTop",
        "paddingRight",
        "borderRadius",
        "backgroundColor",
        "boxShadow",
      ],
    ],
    [".fields", ".pp-fields", ["rowGap", "columnGap"]],
    [
      ".field label",
      ".pp-field label",
      ["fontSize", "lineHeight", "marginBottom"],
    ],
  ] as const;
  const expected = await reference.evaluate(
    (properties) =>
      properties.map(([selector, , keys]) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        return keys.map((key) => style[key as keyof CSSStyleDeclaration]);
      }),
    properties,
  );
  await directory(page);
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: /^Ver detalles / })
    .click();
  const actual = await page.evaluate(
    (properties) =>
      properties.map(([, selector, keys]) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        return keys.map((key) => style[key as keyof CSSStyleDeclaration]);
      }),
    properties,
  );
  expect(actual).toEqual(expected);
  await reference.locator('[data-tab="historial"]').click();
  await page
    .getByRole("dialog")
    .getByRole("tab", { name: "Historial", exact: true })
    .click();
  const historyProperties = [
    [
      ".chart",
      ".pp-chart",
      ["height", "borderRadius", "paddingTop", "borderTopColor"],
    ],
    [
      "#historial th",
      ".pp-profile th",
      [
        "fontSize",
        "fontWeight",
        "color",
        "backgroundColor",
        "paddingTop",
        "paddingRight",
      ],
    ],
    [
      "#historial td",
      ".pp-profile td",
      ["fontSize", "paddingTop", "paddingRight"],
    ],
  ] as const;
  const expectedHistory = await reference.evaluate(
    (properties) =>
      properties.map(([selector, , keys]) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        return keys.map((key) => style[key as keyof CSSStyleDeclaration]);
      }),
    historyProperties,
  );
  const actualHistory = await page.evaluate(
    (properties) =>
      properties.map(([, selector, keys]) => {
        const style = getComputedStyle(document.querySelector(selector)!);
        return keys.map((key) => style[key as keyof CSSStyleDeclaration]);
      }),
    historyProperties,
  );
  expect(actualHistory).toEqual(expectedHistory);
  await reference.close();
});
async function directory(page: Page) {
  await page.goto("/mantenimientos");
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
}
test("supplier table searches, combines filters, sorts and paginates actual records", async ({
  page,
}) => {
  await directory(page);
  await page.evaluate((k) => {
    const state = JSON.parse(localStorage.getItem(k)!);
    for (let i = 0; i < 23; i++)
      state.suppliers.push({
        ...state.suppliers[0],
        id: `TEST-${String(i).padStart(2, "0")}`,
        name: `Empresa ficticia ${String(i).padStart(2, "0")}`,
        taxId: `20980000${String(i).padStart(3, "0")}`,
        category: i % 2 ? "Insumos" : "Servicios",
        active: i % 3 !== 0,
        demo: true,
      });
    localStorage.setItem(k, JSON.stringify(state));
  }, key);
  await page.reload();
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await expect(page.locator(".supplier-card")).toHaveCount(0);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Página siguiente", exact: true })
    .click();
  await expect(page.locator(".pagination")).toContainText("11–20 de 26");
  await page.getByLabel("Buscar registros").fill("TEST-22");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Empresa ficticia 22");
  await page.getByLabel("Buscar registros").fill("20980000022");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar registros").fill("Empresa ficticia 22");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar registros").fill("");
  await page.getByLabel("Categoría del proveedor").selectOption("Servicios");
  await page.getByLabel("Estado del proveedor").selectOption("true");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page
    .getByRole("columnheader", { name: "Razón social" })
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("columnheader", { name: "Razón social" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await page
    .getByRole("columnheader", { name: "Razón social" })
    .getByRole("button")
    .click();
  await expect(page.locator("tbody tr").first()).toContainText(
    "Empresa ficticia 22",
  );
  await page.getByLabel("Buscar registros").fill("sin resultados");
  await expect(
    page.getByRole("heading", { name: "Sin resultados" }),
  ).toBeVisible();
});
test("new supplier validates fields and duplicates, persists and is shared with purchase selection", async ({
  page,
}) => {
  await directory(page);
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).toContainText("La razón social es obligatoria");
  await form
    .getByLabel("Razón social", { exact: true })
    .fill("Empresa ficticia de prueba premium");
  await form.getByLabel("RUC", { exact: true }).fill("20600000014");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).toContainText("dígito verificador");
  await form.getByLabel("RUC", { exact: true }).fill("20600000013");
  await form.getByLabel("Correo empresarial").fill("bad-email");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).toContainText("correo electrónico válido");
  await form.getByLabel("Correo empresarial").fill("compras@ficticia.example");
  await form.getByLabel("Persona de contacto").fill("Contacto de prueba");
  await form.getByLabel("Categoría del proveedor").fill("Servicios");
  await form.getByLabel("Condición de pago").fill("Contado");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).not.toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await page
    .getByLabel("Buscar registros")
    .fill("Empresa ficticia de prueba premium");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const stored = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k)!).suppliers.find(
        (s: any) => s.name === "Empresa ficticia de prueba premium",
      ),
    key,
  );
  expect(stored.demo).toBeUndefined();
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  await form.getByLabel("Razón social", { exact: true }).fill("Duplicado");
  await form.getByLabel("RUC", { exact: true }).fill("20600000013");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).toContainText("Ya existe un proveedor con este RUC");
  await page.keyboard.press("Escape");
  await expect(form).not.toBeVisible();
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
  await selector.getByLabel("Buscar proveedores").fill(stored.id);
  await selector.getByRole("button", { name: /^Ver proveedor/ }).click();
  await expect(selector.getByRole("tabpanel")).toContainText(stored.name);
  await selector
    .getByRole("button", { name: "Seleccionar proveedor", exact: true })
    .click();
  await expect(page.locator(".selected-supplier-summary")).toContainText(
    stored.name,
  );
});
test("premium reference has four tabs, computed KPIs, inline contact editing and linked history", async ({
  page,
}) => {
  await directory(page);
  const row = page.locator("tbody tr").filter({ hasText: "PRO-1" });
  await row.getByRole("button", { name: /^Ver detalles / }).click();
  const modal = page.getByRole("dialog", {
    name: "Ficha del proveedor",
    exact: true,
  });
  await expect(modal.locator(".pp-eyebrow")).toHaveText("Ficha empresarial");
  await expect(modal.getByRole("tab")).toHaveCount(4);
  await expect(modal.locator(".pp-stat")).toHaveCount(3);
  const activity = await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    const docs = s.documents.filter(
      (d: any) => d.kind === "OC" && d.partyId === "PRO-1",
    );
    return {
      count: docs.length,
      total: docs.reduce((n: number, d: any) => n + d.total, 0),
    };
  }, key);
  await expect(modal.locator(".pp-stat-value").first()).toHaveText(
    String(activity.count),
  );
  await modal.getByRole("tab", { name: "Contacto", exact: true }).click();
  await modal.getByRole("button", { name: "Editar", exact: true }).click();
  await modal.getByLabel("Persona de contacto").fill("Contacto actualizado");
  await modal
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(modal).toContainText("Información de contacto actualizada");
  await modal.getByRole("tab", { name: "Comercial", exact: true }).click();
  await expect(modal.getByRole("tabpanel")).toContainText("Condición de pago");
  await modal.getByRole("tab", { name: "Historial", exact: true }).click();
  await expect(
    modal.getByRole("img", {
      name: "Evolución mensual de importes de órdenes de compra",
    }),
  ).toBeVisible();
  await expect(modal.getByRole("tabpanel")).toContainText("DEMO");
  await expect(modal.getByRole("tabpanel")).toContainText(
    "Productos más adquiridos",
  );
  await modal.getByRole("button", { name: "Restablecer vista" }).click();
  await expect(
    modal.getByRole("tab", { name: "General", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(row).toContainText("Contacto actualizado");
  await page.reload();
  await page.getByRole("button", { name: "Proveedores", exact: true }).click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "PRO-1" }),
  ).toContainText("Contacto actualizado");
});
test("linked supplier deactivates after confirmation and unlinked supplier deletes safely", async ({
  page,
}) => {
  await directory(page);
  const before = await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k)!);
    return JSON.stringify([s.documents, s.movements, s.stock]);
  }, key);
  await page
    .locator("tbody tr")
    .filter({ hasText: "PRO-1" })
    .getByRole("button", { name: /^Eliminar / })
    .click();
  const dialog = page.getByRole("dialog", { name: "Desactivar proveedor" });
  await expect(dialog).toContainText("PRO-1");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator("tbody tr").filter({ hasText: "PRO-1" }),
  ).toContainText("Activo");
  await page
    .locator("tbody tr")
    .filter({ hasText: "PRO-1" })
    .getByRole("button", { name: /^Eliminar / })
    .click();
  await dialog
    .getByRole("button", { name: "Desactivar proveedor", exact: true })
    .click();
  await expect(
    page.locator("tbody tr").filter({ hasText: "PRO-1" }),
  ).toContainText("Inactivo");
  expect(
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k)!);
      return JSON.stringify([s.documents, s.movements, s.stock]);
    }, key),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await form
    .getByLabel("Razón social", { exact: true })
    .fill("Empresa ficticia sin operaciones");
  await form.getByLabel("RUC", { exact: true }).fill("20600000013");
  await form.getByRole("button", { name: "Guardar proveedor" }).click();
  await expect(form).not.toBeVisible();
  const unlinked = page
    .locator("tbody tr")
    .filter({ hasText: "Empresa ficticia sin operaciones" });
  await unlinked.getByRole("button", { name: /^Eliminar / }).click();
  await page
    .getByRole("dialog", { name: "Eliminar proveedor" })
    .getByRole("button", { name: "Eliminar proveedor", exact: true })
    .click();
  await expect(unlinked).toHaveCount(0);
});
test("clients and products provide functional view, edit and safe deletion actions", async ({
  page,
}) => {
  await page.goto("/mantenimientos");
  let row = page.locator("tbody tr").first();
  await row.getByRole("button", { name: /^Ver detalles / }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await row.getByRole("button", { name: /^Editar / }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Contacto", { exact: true })
    .fill("Cliente actualizado");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar cliente", exact: true })
    .click();
  await expect(row).toContainText("Cliente actualizado");
  await page
    .getByRole("button", { name: "Productos", exact: false })
    .first()
    .click();
  row = page.locator("tbody tr").first();
  await row.getByRole("button", { name: /^Eliminar / }).click();
  await page
    .getByRole("dialog", { name: "Desactivar producto" })
    .getByRole("button", { name: "Desactivar producto", exact: true })
    .click();
  await expect(row).toContainText("Inactivo");
});
test("premium profile is responsive and supplier interfaces never expose country or website fields", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await directory(page);
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: /^Ver detalles / })
    .click();
  const profile = page.getByRole("dialog", { name: "Ficha del proveedor" });
  for (const tab of ["General", "Contacto", "Comercial", "Historial"]) {
    await profile.getByRole("tab", { name: tab, exact: true }).click();
    await expect(profile.getByRole("tabpanel")).not.toContainText(
      /País|Página web|Sitio web/,
    );
  }
  const bounds = await profile.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    scroll: el.scrollWidth,
    client: el.clientWidth,
    bottom: el.getBoundingClientRect().bottom,
  }));
  expect(bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
  expect(bounds.bottom).toBeLessThanOrEqual(844);
  await page.screenshot({
    path: "test-results/premium-supplier-mobile.png",
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(profile).not.toBeVisible();
  await page
    .getByRole("button", { name: "Nuevo proveedor", exact: true })
    .click();
  const form = page.getByRole("dialog", { name: "Nuevo proveedor" });
  await expect(form).not.toContainText(/País|Página web|Sitio web/);
  await page.keyboard.press("Escape");
  await expect(form).not.toBeVisible();
});
