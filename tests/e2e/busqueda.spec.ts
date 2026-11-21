import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { esperarColoresEstables } from "./apoyo/hoja";

// LAB-23 y LAB-71: inicio del cliente y resultados de búsqueda. Se ven sin cuenta, así que corre
// contra el servidor base (sin sesión falsa). Las pruebas de datos necesitan un Supabase con
// profesionales publicados (E2E_BUSQUEDA=1, por ejemplo con supabase/seed.sql en local).

const URL_CLIENTE = `http://localhost:${Number(process.env.PUERTO_E2E ?? 3000) + 200}`;

const esCelular = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

test.describe("inicio", () => {
  test("celular: la grilla lleva a la búsqueda con el barrio; escritorio: se queda en el inicio", async ({
    page,
  }) => {
    await page.goto("/inicio");
    await expect(page.getByRole("heading", { level: 1, name: "¿Qué se rompió?" })).toBeVisible();
    if (!esCelular(page)) {
      // LAB-71: el inicio de escritorio ya no redirige a /buscar.
      await expect(page).toHaveURL(/\/inicio$/);
      return;
    }
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
    // El nombre de cada tarjeta de oficio incluye su número de verificados: se busca por el comienzo.
    await expect(page.getByRole("link", { name: /^Gas/ })).toHaveAttribute(
      "href",
      /^\/buscar\?oficio=gas&barrio=[a-z0-9-]+$/,
    );
    await expect(page.getByRole("link", { name: /Mecánica/ })).toHaveAttribute(
      "href",
      /oficio=mecanica/,
    );
    await expect(page.getByRole("link", { name: "Publicar un trabajo" })).toHaveAttribute(
      "href",
      "/trabajos/nuevo",
    );
  });

  test("elegir un problema muestra el oficio que lo arregla", async ({ page }) => {
    await page.goto("/inicio");
    await page.getByRole("link", { name: "Hay olor a gas" }).click();
    await expect(page).toHaveURL(/problema=olor-a-gas/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Eso lo arregla un gasista" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Hay olor a gas" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });
});

test.describe("barra según la sesión", () => {
  test("sin cuenta: Ingresar y Crear cuenta; con cliente: navegación de la app", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    const cuenta = page.getByRole("navigation", { name: "Cuenta" });
    await expect(cuenta.getByRole("link", { name: "Ingresar" })).toBeVisible();
    await expect(cuenta.getByRole("link", { name: "Crear cuenta" })).toBeVisible();

    await page.goto(`${URL_CLIENTE}/buscar?oficio=gas&barrio=centro`);
    await expect(page.getByRole("heading", { level: 1, name: /^Gas cerca de/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Ingresar" })).toHaveCount(0);
  });
});

test.describe("resultados", () => {
  test("sin cuenta se ve la pantalla, con título del oficio y filtros en la URL", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    await expect(page.getByRole("heading", { level: 1, name: /^Gas cerca de/ })).toBeVisible();
    await expect(page).toHaveURL(/\/buscar/);

    await page.getByRole("button", { name: "Mejor calificados" }).click();
    await expect(page).toHaveURL(/orden=calificacion/);
    await expect(page).toHaveURL(/oficio=gas/);
    await expect(page.getByRole("button", { name: "Mejor calificados" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // La distancia es un Select: "Toda la ciudad" cambia la URL a `toda_la_ciudad=1`.
    await page.getByLabel("Distancia").click();
    await page.getByRole("option", { name: "Toda la ciudad" }).click();
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

  test("solo matriculados se ofrece únicamente para gas y electricidad", async ({ page }) => {
    await page.goto("/buscar?oficio=pintura&barrio=centro");
    await expect(page.getByRole("button", { name: "Solo matriculados" })).toHaveCount(0);
    await page.goto("/buscar?oficio=electricidad&barrio=centro");
    await expect(page.getByRole("button", { name: "Solo matriculados" })).toBeVisible();
  });

  test("escritorio: el oficio se elige en el selector y la columna lateral explica 'verificado'", async ({
    page,
  }) => {
    test.skip(esCelular(page), "La columna lateral es de escritorio");
    await page.goto("/buscar?barrio=centro");
    await page.getByLabel("Oficio", { exact: true }).click();
    await page.getByRole("option", { name: "Plomería" }).click();
    await expect(page).toHaveURL(/oficio=plomeria/);
    await expect(page.getByRole("heading", { level: 1, name: /^Plomería cerca de/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Qué quiere decir “verificado”" }),
    ).toBeVisible();
  });

  test("selector de oficio (Select): flechas, Enter, Esc y anuncio al lector de pantalla", async ({
    page,
  }) => {
    await page.goto("/buscar?barrio=centro");
    await page.waitForLoadState("networkidle");
    const oficio = page.getByLabel("Oficio", { exact: true });
    await oficio.focus();
    await page.keyboard.press("Enter");
    await expect(oficio).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(oficio).toHaveAttribute("aria-expanded", "false");
    await expect(oficio).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(oficio).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("option", { name: "Todos los oficios" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: "Gas" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(oficio).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/oficio=gas/);
    await expect(page.getByRole("status").filter({ hasText: "Oficio: Gas" })).toBeAttached();
  });

  test("selector de barrio (Combobox): búsqueda, flechas, Enter, Esc y anuncio al lector de pantalla", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    await page.waitForLoadState("networkidle");
    const barrio = page.getByRole("combobox", { name: "Tu barrio" });
    await barrio.focus();
    await page.keyboard.press("Enter");
    await expect(barrio).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(barrio).toHaveAttribute("aria-expanded", "false");
    await expect(barrio).toBeFocused();

    await page.keyboard.press("ArrowDown");
    const buscador = page.getByPlaceholder("Buscá tu barrio…");
    await expect(buscador).toBeFocused();
    // Navega con flechas dentro de la lista abierta antes de confirmar con Enter.
    const opciones = page.getByRole("option");
    await expect(opciones.nth(0)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(opciones.nth(1)).toHaveAttribute("aria-selected", "true");
    const segundoNombre = (await opciones.nth(1).textContent())?.trim() ?? "";
    expect(segundoNombre.length).toBeGreaterThan(0);
    await page.keyboard.press("Enter");
    await expect(barrio).toHaveAttribute("aria-expanded", "false");
    await expect(page).not.toHaveURL(/barrio=centro$/);
    await expect(
      page.getByRole("status").filter({ hasText: `Tu barrio: ${segundoNombre}` }),
    ).toBeAttached();

    // También filtra escribiendo en el buscador sin acentos (Chauvín existe en falso y en Supabase real).
    await barrio.click();
    await expect(buscador).toBeFocused();
    await buscador.fill("chauvin");
    await expect(page.getByRole("option", { name: "Chauvín" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/barrio=chauvin/);
    await expect(page.getByRole("status").filter({ hasText: "Tu barrio: Chauvín" })).toBeAttached();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`no tiene problemas de accesibilidad (${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await esperarColoresEstables(page);
      await page.goto("/buscar?oficio=gas&barrio=centro");
      await expect(page.getByRole("heading", { level: 1, name: /^Gas cerca de/ })).toBeVisible();
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
    const tarjetas = page.locator("main ol li a[href^='/profesionales/']");
    await expect(tarjetas.first()).toBeVisible();

    const km = await page.locator("main ol li a[href^='/profesionales/']").evaluateAll((els) =>
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

  test("sin oficio, 'Ver más' acumula de a 20 por página y la URL guarda la página", async ({
    page,
  }) => {
    await page.goto("/buscar?barrio=centro");
    const tarjetas = page.locator("main ol li a[href^='/profesionales/']");
    await expect(tarjetas).toHaveCount(20);
    await page.getByRole("link", { name: "Ver más" }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(tarjetas).toHaveCount(40);
    await page.reload();
    await expect(tarjetas).toHaveCount(40);
  });

  test("la URL es el estado: recargar conserva los filtros y atrás/adelante los recorren", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=gas&barrio=centro");
    await expect(page.getByRole("heading", { level: 1, name: /^Gas cerca de/ })).toBeVisible();
    await page.getByRole("button", { name: "Solo matriculados" }).click();
    await expect(page).toHaveURL(/matriculados=1/);
    await page.reload();
    await expect(page).toHaveURL(/oficio=gas.*matriculados=1|matriculados=1.*oficio=gas/);
    await expect(page.getByRole("button", { name: "Solo matriculados" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.goBack();
    await expect(page).not.toHaveURL(/matriculados=1/);
    await page.goForward();
    await expect(page).toHaveURL(/matriculados=1/);
  });

  test("sin resultados muestra el estado vacío con la salida a publicar un trabajo", async ({
    page,
  }) => {
    await page.goto("/buscar?oficio=carpinteria&barrio=centro&matriculados=1");
    await expect(page.getByText("No hay profesionales con esos filtros todavía.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Publicar el trabajo|Publicá el trabajo/ }),
    ).toBeVisible();
  });
  for (const esquema of ["light", "dark"] as const) {
    test(`con resultados y con estado vacío no hay problemas de accesibilidad (${esquema})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await esperarColoresEstables(page);
      for (const url of [
        "/buscar?barrio=centro",
        "/buscar?oficio=carpinteria&barrio=centro&matriculados=1",
      ]) {
        await page.goto(url);
        await expect(page.locator("main h1")).toBeVisible();
        const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(resultado.violations, url).toEqual([]);
      }
    });
  }
});
