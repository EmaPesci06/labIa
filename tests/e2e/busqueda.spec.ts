import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// LAB-23: inicio del cliente y resultados de búsqueda. Se ven sin cuenta, así que corre contra el
// servidor base (sin sesión falsa). Las pruebas de datos necesitan un Supabase con profesionales
// publicados (E2E_BUSQUEDA=1, por ejemplo con supabase/seed.sql en local).

const esCelular = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

test.describe("inicio", () => {
  test("celular: la grilla lleva a la búsqueda con el barrio; escritorio: redirige a /buscar", async ({
    page,
  }) => {
    await page.goto("/inicio");
    if (!esCelular(page)) {
      await expect(page).toHaveURL(/\/buscar\?barrio=[a-z0-9-]+$/);
      return;
    }
    await expect(
      page.getByRole("heading", { level: 1, name: "¿Qué necesitás arreglar?" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gas", exact: true })).toHaveAttribute(
      "href",
      /^\/buscar\?oficio=gas&barrio=[a-z0-9-]+$/,
    );
    await expect(page.getByRole("link", { name: "Mecánica" })).toHaveAttribute(
      "href",
      /oficio=mecanica/,
    );
    await expect(page.getByRole("link", { name: /Publicar/ }).first()).toHaveAttribute(
      "href",
      "/trabajos/nuevo",
    );
  });
});

test.describe("resultados", () => {
  test("sin cuenta se ve la pantalla, con título en plural y filtros en la URL", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    await expect(page.getByRole("heading", { level: 1, name: "Gasistas" })).toBeVisible();
    await expect(page).toHaveURL(/\/buscar/);

    await page.getByRole("button", { name: "Mejor calificados" }).click();
    await expect(page).toHaveURL(/orden=calificacion/);
    await expect(page).toHaveURL(/oficio=gas/);
    await expect(page.getByRole("button", { name: "Mejor calificados" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Toda la ciudad" }).click();
    await expect(page).toHaveURL(/toda_la_ciudad=1/);
    await page.goBack();
    await expect(page).not.toHaveURL(/toda_la_ciudad=1/);
  });

  test("un oficio inexistente muestra un error en castellano, no una pantalla rota", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=magia&barrio=centro");
    await expect(page.locator("main [role=alert]")).toContainText("Ese oficio no existe.");
  });

  test("solo matriculados se ofrece en celular únicamente para gas y electricidad", async ({
    page,
  }) => {
    test.skip(!esCelular(page), "En escritorio el filtro está siempre en la columna lateral");
    await page.goto("/buscar?oficio=pintura&barrio=centro");
    await expect(page.getByRole("button", { name: "Solo matriculados" })).toHaveCount(0);
    await page.goto("/buscar?oficio=electricidad&barrio=centro");
    await expect(page.getByRole("button", { name: "Solo matriculados" })).toBeVisible();
  });

  test("escritorio: columna de filtros con oficio y confianza", async ({ page }) => {
    test.skip(esCelular(page), "La columna lateral es de escritorio");
    await page.goto("/buscar?barrio=centro");
    const filtros = page.getByRole("complementary", { name: "Filtros" });
    await expect(filtros).toBeVisible();
    await filtros.getByRole("button", { name: "Plomería" }).click();
    await expect(page).toHaveURL(/oficio=plomeria/);
    await expect(page.getByRole("heading", { level: 1, name: "Plomeros" })).toBeVisible();
    await expect(
      filtros.getByText("Todos los perfiles tienen identidad y antecedentes verificados."),
    ).toBeVisible();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`no tiene problemas de accesibilidad (${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto("/buscar?oficio=gas&barrio=centro");
      await expect(page.getByRole("heading", { level: 1, name: "Gasistas" })).toBeVisible();
      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("con profesionales publicados", () => {
  test.skip(process.env.E2E_BUSQUEDA !== "1", "Necesita Supabase con datos (E2E_BUSQUEDA=1).");

  test("elegir oficio, ver resultados por cercanía y reducirlos con matriculados", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    const tarjetas = page.locator("main ul li a[href^='/profesionales/']");
    await expect(tarjetas.first()).toBeVisible();

    const km = await page.locator("main ul li a[href^='/profesionales/']").evaluateAll((els) =>
      els.map((el) => {
        const texto = el.textContent?.match(/a (\d+,\d) km/)?.[1] ?? "0";
        return Number(texto.replace(",", "."));
      }),
    );
    expect(km).toEqual([...km].sort((a, b) => a - b));

    const antes = await tarjetas.count();
    await page.getByRole("button", { name: "Solo matriculados" }).click();
    await expect(page).toHaveURL(/matriculados=1/);
    await expect(async () => {
      const despues = await tarjetas.count();
      expect(despues).toBeLessThanOrEqual(antes);
      await expect(page.getByText("Matriculado", { exact: true })).toHaveCount(despues);
    }).toPass();
  });
});
