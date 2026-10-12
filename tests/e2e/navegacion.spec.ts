import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Segundo servidor (mismo build) con LABIA_ROL_DEV=profesional; ver playwright.config.ts.
const URL_PROFESIONAL = `http://localhost:${Number(process.env.PUERTO_E2E ?? 3000) + 100}`;

const esCelular = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;
const barraInferior = (page: Page) => page.getByRole("navigation", { name: "Navegación" });
const barraSuperior = (page: Page) => page.getByRole("navigation", { name: "Principal" });

test.describe("navegación del cliente", () => {
  test("celular: barra inferior; escritorio: barra superior", async ({ page }) => {
    await page.goto("/inicio");
    if (esCelular(page)) {
      await expect(barraInferior(page)).toBeVisible();
      await expect(barraSuperior(page)).toBeHidden();
      const items = barraInferior(page).getByRole("link");
      await expect(items).toHaveText(["Inicio", "Mis trabajos", "Mi cuenta"]);
      await expect(items.first()).toHaveAttribute("aria-current", "page");
      await expect(barraInferior(page).locator("[aria-current]")).toHaveCount(1);
    } else {
      await expect(barraSuperior(page)).toBeVisible();
      await expect(barraInferior(page)).toBeHidden();
      await expect(barraSuperior(page).getByRole("link")).toHaveText([
        "Buscar profesionales",
        "Publicar un trabajo",
        "Mis trabajos",
      ]);
      await expect(page.getByRole("link", { name: "Publicar trabajo" })).toBeVisible();
      await expect(page.getByRole("banner").first()).toHaveCSS("height", "72px");
    }
  });

  test("el ítem activo cambia al navegar", async ({ page }) => {
    await page.goto("/inicio");
    const barra = esCelular(page) ? barraInferior(page) : barraSuperior(page);
    await barra.getByRole("link", { name: "Mis trabajos" }).click();
    await expect(page).toHaveURL(/\/mis-trabajos$/);
    await expect(barra.getByRole("link", { name: "Mis trabajos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(barra.locator("[aria-current]")).toHaveCount(1);
  });

  test("la barra inferior no tapa el final de la página", async ({ page }) => {
    test.skip(!esCelular(page), "La barra inferior es solo de celular");
    await page.goto("/inicio");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const pie = await page.getByRole("link", { name: "Privacidad" }).boundingBox();
    const barra = await barraInferior(page).boundingBox();
    expect(pie).not.toBeNull();
    expect(barra).not.toBeNull();
    expect(barra?.height).toBeGreaterThanOrEqual(64);
    expect((pie?.y ?? 0) + (pie?.height ?? 0)).toBeLessThanOrEqual((barra?.y ?? 0) + 1);
  });

  test("el menú del avatar tiene Mi cuenta, Tema y Salir", async ({ page }) => {
    test.skip(esCelular(page), "El avatar está en la barra superior de escritorio");
    await page.goto("/inicio");
    await page.getByRole("button", { name: /Cuenta de/ }).click();
    await expect(page.getByRole("link", { name: "Mi cuenta" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Salir" })).toBeVisible();
    await page.getByText("Oscuro", { exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Mi cuenta" })).toBeHidden();
  });

  test("el selector de tema de /cuenta cambia a oscuro", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByText("Oscuro", { exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`/inicio no tiene problemas de accesibilidad (${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto("/inicio");
      await expect(page.locator("html")).toHaveClass(
        esquema === "dark" ? /dark/ : /^((?!dark).)*$/,
      );
      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(resultado.violations).toEqual([]);
    });
  }
});

test.describe("navegación del profesional", () => {
  test.use({ baseURL: URL_PROFESIONAL });

  test("Trabajos, Postulaciones y Mi perfil; el activo sigue a ?vista=mias", async ({ page }) => {
    await page.goto("/trabajos");
    const barra = esCelular(page) ? barraInferior(page) : barraSuperior(page);
    await expect(barra.getByRole("link")).toHaveText(["Trabajos", "Postulaciones", "Mi perfil"]);
    await expect(barra.getByRole("link", { name: "Trabajos" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await barra.getByRole("link", { name: "Postulaciones" }).click();
    await expect(page).toHaveURL(/\/trabajos\?vista=mias$/);
    await expect(barra.getByRole("link", { name: "Postulaciones" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(barra.getByRole("link", { name: "Trabajos" })).not.toHaveAttribute("aria-current");

    await barra.getByRole("link", { name: "Mi perfil" }).click();
    await expect(page).toHaveURL(/\/profesionales\/demo$/);
    await expect(barra.locator("[aria-current]")).toHaveText("Mi perfil");
  });

  test("escritorio: botón Ver trabajos", async ({ page }) => {
    test.skip(esCelular(page), "El botón está en la barra superior de escritorio");
    await page.goto("/mis-trabajos");
    await expect(page.getByRole("link", { name: "Ver trabajos" })).toHaveAttribute(
      "href",
      "/trabajos",
    );
  });
});

test.describe("rutas inexistentes", () => {
  test("muestra la página 404 de la marca con botón a inicio", async ({ page }) => {
    const respuesta = await page.goto("/esto-no-existe");
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute(
      "href",
      "/inicio",
    );
  });
});

test.describe("PWA", () => {
  test("el manifest y los theme-color están declarados", async ({ page, request }) => {
    await page.goto("/inicio");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
    await expect(page.locator('meta[name="theme-color"][media*="light"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"][media*="dark"]')).toHaveCount(1);
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveCount(1);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({
      name: "LabÍA",
      short_name: "LabÍA",
      lang: "es-AR",
      start_url: "/inicio",
      display: "standalone",
    });
  });

  test("Chrome no encuentra errores de instalabilidad", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Solo Chromium expone la instalabilidad");
    await page.goto("/inicio");
    await page.evaluate(() => navigator.serviceWorker.ready);
    const sesion = await page.context().newCDPSession(page);
    const { installabilityErrors } = await sesion.send("Page.getInstallabilityErrors");
    expect(installabilityErrors).toEqual([]);
  });

  test("sin conexión se ve /sin-conexion", async ({ page, context }) => {
    await page.goto("/inicio");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // El service worker toma el control de la pestaña recién al recargar.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);

    await context.setOffline(true);
    await page.goto("/mis-trabajos");
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
    await expect(
      page.getByText("Sin conexión. Revisá tu internet y volvé a intentar."),
    ).toBeVisible();
    // La pantalla se ve completa (con estilos y logo), no solo el texto crudo.
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toHaveCSS(
      "font-weight",
      "800",
    );

    await context.setOffline(false);
  });
});
