import { test, expect } from "../fixtures/browser-test";
const key = "enterprisecloud-integrated-erp-v1";
for (const mobile of [false, true])
  test(`quotation customer lifecycle and persistence ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/cotizacion");
    await page.getByRole("button", { name: "+ Nueva cotización" }).click();
    const quote = page.getByRole("dialog", {
      name: "Nueva cotización",
      exact: true,
    });
    await quote
      .getByLabel("Observaciones", { exact: true })
      .fill("Entrega coordinada con el cliente");
    await quote
      .getByRole("button", { name: "Seleccionar cliente existente" })
      .click();
    const customers = page.getByRole("dialog", {
      name: "Seleccionar cliente",
      exact: true,
    });
    const existingId = await page.evaluate(
      (k) =>
        JSON.parse(localStorage.getItem(k)!).customers.find(
          (c: { active: boolean }) => c.active,
        ).id,
      key,
    );
    await customers.getByLabel("Buscar cliente").fill(existingId);
    await customers.locator(".customer-results button").first().click();
    await expect(customers).toBeHidden();
    await quote.getByRole("button", { name: "Ver detalles" }).click();
    const details = page.getByRole("dialog", {
      name: "Detalles del cliente",
      exact: true,
    });
    await details.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(details).toBeHidden();
    await quote
      .getByRole("button", { name: "Nuevo cliente", exact: true })
      .click();
    const editor = page.getByRole("dialog", {
      name: "Nuevo cliente",
      exact: true,
    });
    await editor.getByLabel("Tipo de cliente").selectOption("DNI");
    await editor.getByLabel("DNI", { exact: true }).fill("98765432");
    await editor
      .getByLabel("Nombre completo")
      .fill("Cliente de prueba premium");
    await editor.getByRole("button", { name: "Guardar cliente" }).click();
    await expect(editor).toBeHidden();
    await expect(quote.locator(".customer-select-trigger")).toContainText(
      "Cliente de prueba premium",
    );
    await expect(
      quote.getByLabel("Observaciones", { exact: true }),
    ).toHaveValue("Entrega coordinada con el cliente");
    await quote
      .getByRole("button", { name: "Seleccionar productos", exact: true })
      .click();
    const picker = page.getByRole("dialog", {
      name: "Seleccionar productos",
      exact: true,
    });
    await picker.getByLabel("Buscar productos").fill("PRD-001");
    await picker.getByRole("button", { name: "Agregar", exact: true }).click();
    await picker.getByRole("button", { name: "Agregar seleccionados" }).click();
    await expect(picker).toBeHidden();
    await quote.getByLabel("Cantidad PRD-001").fill("3");
    await quote.getByLabel("Precio PRD-001").fill("100");
    await quote.getByLabel("Descuento global").fill("20");
    await quote.getByLabel("Flete", { exact: true }).fill("10");
    await expect(quote.locator(".quote-grand-total strong")).toContainText(
      "290.00",
    );
    await expect(quote.locator(".quote-footer")).toBeVisible();
    await page.screenshot({
      path: `test-results/quote-${mobile ? "mobile" : "desktop"}.png`,
    });
    await quote.getByRole("button", { name: /^Eliminar / }).click();
    await expect(quote.locator(".quote-empty")).toBeVisible();
    await expect(
      quote.getByRole("button", { name: "Guardar cotización" }),
    ).toBeDisabled();
    await quote
      .getByRole("button", { name: "Seleccionar productos", exact: true })
      .click();
    await picker.getByLabel("Buscar productos").fill("PRD-001");
    await picker.getByRole("button", { name: "Agregar", exact: true }).click();
    await picker.getByRole("button", { name: "Agregar seleccionados" }).click();
    await expect(picker).toBeHidden();
    await quote.getByLabel("Cantidad PRD-001").fill("3");
    await quote.getByLabel("Precio PRD-001").fill("100");
    await quote.getByRole("button", { name: "Guardar cotización" }).click();
    await expect(quote).toBeHidden();
    await page.reload();
    const saved = await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k)!);
      return {
        quote: s.quotes.find(
          (q: { notes: string }) =>
            q.notes === "Entrega coordinada con el cliente",
        ),
        customers: s.customers.filter(
          (c: { taxId: string }) => c.taxId === "98765432",
        ),
      };
    }, key);
    expect(saved.customers).toHaveLength(1);
    expect(saved.quote.partyId).toBe(saved.customers[0].id);
    expect(saved.quote.total).toBe(290);
    await page.goto("/mantenimientos");
    await page.getByLabel("Buscar registros").fill("98765432");
    await expect(
      page.getByRole("row").filter({ hasText: "98765432" }),
    ).toContainText("Cliente de prueba premium");
    expect(errors).toEqual([]);
  });
