import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LAB-35, LAB-80: no necesitan Supabase; las páginas son estáticas.
for (const { ruta, titulo, otra } of [
  { ruta: "/terminos", titulo: "Términos y condiciones", otra: "/privacidad" },
  { ruta: "/privacidad", titulo: "Política de privacidad", otra: "/terminos" },
]) {
  test.describe(ruta, () => {
    test("muestra el borrador, el índice, los marcadores y la versión", async ({ page }) => {
      await page.goto(ruta);
      await expect(page.getByRole("heading", { level: 1, name: titulo })).toBeVisible();
      await expect(page.getByText("Versión borrador.")).toBeVisible();
      await expect(page.getByTestId("version-legal")).toContainText("(borrador)");
      await expect(page.getByText("[RAZÓN SOCIAL]").first()).toBeVisible();

      const selector = page.getByRole("navigation", { name: "Documentos legales" });
      await expect(selector).toBeVisible();
      await expect(selector.locator("[aria-current='page']")).toHaveCount(1);

      const indice = page.getByRole("navigation", { name: "Índice" });
      await expect(indice).toBeVisible();
      const primero = indice.getByRole("link").first();
      const destino = (await primero.getAttribute("href")) ?? "";
      await primero.click();
      await expect(page).toHaveURL(new RegExp(`${destino}$`));

      // Sin scroll horizontal en ninguno de los dos tamaños.
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda).toBe(false);
    });

    test("enlaza con el otro documento", async ({ page }) => {
      await page.goto(ruta);
      await page.locator(`article footer a[href="${otra}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${otra}$`));
    });
  });
}

test("los términos incluyen las diez normas", async ({ page }) => {
  await page.goto("/terminos");
  await expect(
    page.getByRole("list", { name: "Compromisos de seguridad" }).getByRole("listitem"),
  ).toHaveCount(10);
});

test("/normas muestra el encabezado, los diez compromisos y qué hace Oficio Seguro", async ({
  page,
}) => {
  await page.goto("/normas");
  await expect(page.getByRole("heading", { level: 1, name: "Normas de seguridad" })).toBeVisible();
  await expect(
    page.getByText("A lo que se compromete cada profesional antes de aparecer en Oficio Seguro."),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Compromisos de seguridad" }).getByRole("listitem"),
  ).toHaveCount(10);
  await expect(
    page.getByRole("heading", { level: 2, name: "Qué hace Oficio Seguro" }),
  ).toBeVisible();
});

for (const esquema of ["light", "dark"] as const) {
  for (const ruta of ["/normas", "/terminos", "/privacidad", "/cuenta-eliminada"]) {
    test(`${ruta} sin violaciones de accesibilidad (${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
}
