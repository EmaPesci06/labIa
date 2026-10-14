import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LAB-33: Mi cuenta. Corre contra los servidores con sesión falsa (cliente y profesional); el
// guardado, el borrado y la descarga necesitan Supabase y se prueban con pruebas de unidad y pgTAP.
const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;

test.describe("mi cuenta (cliente)", () => {
  test.use({ baseURL: URL_CLIENTE });

  test("lista de ajustes con encabezado, secciones y zona de borrado", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page.getByText("Laura Fernández")).toBeVisible();
    await expect(page.getByText("Cliente", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mis datos", exact: true })).toHaveAttribute(
      "href",
      "/cuenta/datos",
    );
    await expect(page.getByRole("link", { name: "Emails" })).toHaveAttribute(
      "href",
      "/cuenta/emails",
    );
    await expect(page.getByRole("link", { name: "Normas de seguridad" })).toHaveAttribute(
      "href",
      "/normas",
    );
    await expect(page.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
    await expect(
      page.locator("#contenido").getByRole("link", { name: "Privacidad" }),
    ).toHaveAttribute("href", "/privacidad");
    await expect(page.getByText("Si estás en peligro, llamá al 911.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Descargar mis datos" })).toHaveAttribute(
      "href",
      "/api/cuenta/datos",
    );
    await expect(page.getByRole("link", { name: "Borrar mi cuenta" })).toHaveAttribute(
      "href",
      "/cuenta/borrar",
    );
    await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
    // Un cliente no ve las filas de profesional.
    await expect(page.getByRole("link", { name: "Mi perfil profesional" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Verificación" })).toHaveCount(0);
  });

  test("borrar: pide escribir BORRAR y la contraseña antes de enviar", async ({ page }) => {
    await page.goto("/cuenta/borrar");
    await expect(page.getByRole("heading", { level: 1, name: "Borrar mi cuenta" })).toBeVisible();
    await expect(page.getByText("Las reseñas que escribiste")).toBeVisible();
    await page.getByRole("button", { name: "Borrar mi cuenta para siempre" }).click();
    await expect(page.getByText(/Escribí BORRAR/).first()).toBeVisible();
    await page.getByLabel("Escribí BORRAR para confirmar").fill("borrar");
    await page.getByRole("button", { name: "Borrar mi cuenta para siempre" }).click();
    await expect(page.getByText("Escribí BORRAR, en mayúsculas, para confirmar.")).toBeVisible();
    await expect(page).toHaveURL(/\/cuenta\/borrar$/);
  });

  test("mis datos: valida teléfono y barrio como el registro", async ({ page }) => {
    await page.goto("/cuenta/datos");
    await expect(page.getByRole("heading", { level: 1, name: "Mis datos" })).toBeVisible();
    await page.getByLabel("Celular de WhatsApp").fill("123");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Revisá el número. Ej.: 223 555 1234")).toBeVisible();
    await expect(page.getByText("Elegí tu barrio.")).toBeVisible();
  });

  test("la pantalla de cuenta borrada es pública", async ({ page }) => {
    await page.goto("/cuenta-eliminada");
    await expect(page.getByRole("heading", { level: 1, name: "Borramos tu cuenta" })).toBeVisible();
  });

  for (const esquema of ["light", "dark"] as const) {
    for (const ruta of ["/cuenta", "/cuenta/datos", "/cuenta/borrar"]) {
      test(`${ruta} sin problemas de accesibilidad (${esquema})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: esquema });
        await page.goto(ruta);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeAttached();
        const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(resultado.violations).toEqual([]);
      });
    }
  }
});

test.describe("mi cuenta (profesional)", () => {
  test.use({ baseURL: URL_PROFESIONAL });

  test("suma perfil profesional y verificación", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page.getByText("Profesional", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mi perfil profesional" })).toHaveAttribute(
      "href",
      "/cuenta/perfil",
    );
    await expect(page.getByRole("link", { name: "Verificación" })).toHaveAttribute(
      "href",
      "/cuenta/verificacion",
    );
  });
});
