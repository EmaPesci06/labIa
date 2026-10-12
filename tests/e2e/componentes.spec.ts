import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("/dev/ui", () => {
  test("no tiene errores de axe (claro y oscuro a la vez)", async ({ page }) => {
    await page.goto("/dev/ui");
    await expect(page.getByRole("heading", { level: 1, name: "Componentes base" })).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    expect(resultado.violations).toEqual([]);
  });

  test("la hoja inferior no tiene errores de axe y se cierra con Esc", async ({ page }) => {
    await page.goto("/dev/ui");
    await page.getByRole("button", { name: "Contactar por WhatsApp" }).first().click();
    const dialogo = page.getByRole("dialog", { name: "Antes de contactar" });
    await expect(dialogo).toBeVisible();

    const resultado = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
    expect(resultado.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
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
