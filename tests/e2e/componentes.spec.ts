import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { esperarHojaQuieta, esperarColoresEstables } from "./apoyo/hoja";

test.describe("/dev/ui", () => {
  test("no tiene errores de axe (claro y oscuro a la vez)", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page.getByRole("heading", { level: 1, name: "Componentes base" })).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    expect(resultado.violations).toEqual([]);
  });

  test("la hoja atrapa el foco, se cierra con Esc y devuelve el foco al botón que la abrió", async ({
    page,
  }) => {
    await page.goto("/dev/ui");
    const boton = page.getByRole("button", { name: "Contactar por WhatsApp" }).first();
    await boton.focus();
    await page.keyboard.press("Enter");

    const dialogo = page.getByRole("dialog", { name: "Antes de contactar" });
    await expect(dialogo).toBeVisible();

    const focoAdentro = () =>
      page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    await expect.poll(focoAdentro).toBe(true);

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      await expect.poll(focoAdentro).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(boton).toBeFocused();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`la hoja abierta no tiene errores de axe en modo ${esquema === "light" ? "claro" : "oscuro"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await esperarColoresEstables(page);
      await page.goto("/dev/ui");
      await page.getByRole("button", { name: "Contactar por WhatsApp" }).first().click();

      const dialogo = page.getByRole("dialog", { name: "Antes de contactar" });
      await esperarHojaQuieta(page, dialogo);

      const resultado = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(resultado.violations).toEqual([]);
    });
  }

  test("la hoja se apoya abajo en celular y se centra como diálogo en escritorio", async ({
    page,
  }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Contactar por WhatsApp" }).first().click();

    const dialogo = page.getByRole("dialog", { name: "Antes de contactar" });
    await expect(dialogo).toBeVisible();

    const caja = await dialogo.boundingBox();
    const viewport = page.viewportSize();
    expect(caja).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!caja || !viewport) return;

    if (viewport.width < 1024) {
      expect(caja.width).toBeGreaterThanOrEqual(viewport.width - 2);
      expect(caja.y + caja.height).toBeGreaterThanOrEqual(viewport.height - 2);
    } else {
      expect(caja.width).toBeLessThanOrEqual(562);
      expect(caja.x).toBeGreaterThan(200);
      expect(caja.y).toBeGreaterThan(50);
    }
  });

  test("ningún botón, enlace ni campo mide menos de 44 px de alto", async ({ page }) => {
    await page.goto("/dev/ui");
    const chicos = await page
      .locator("main button, main a, main input, main textarea, main select")
      .evaluateAll((nodos) =>
        nodos
          .map((n) => ({ n, caja: n.getBoundingClientRect() }))
          .filter(({ caja }) => caja.height > 1 && caja.height < 44)
          .map(({ n, caja }) => `${n.tagName} ${n.textContent?.trim()} ${caja.height}`),
      );
    expect(chicos).toEqual([]);
  });
});
