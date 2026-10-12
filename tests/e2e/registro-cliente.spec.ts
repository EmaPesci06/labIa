import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// LAB-17: registro de cliente. Sin Supabase en el servidor de pruebas solo se puede probar la
// pantalla y la validación; el registro completo corre con E2E_AUTH=1 (proyecto de desarrollo
// con confirmación de email desactivada).

test.describe("registro de cliente", () => {
  test("muestra la pantalla del prototipo", async ({ page }) => {
    await page.goto("/registro/cliente");
    await expect(page.getByText("Quiero contratar")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Creá tu cuenta" })).toBeVisible();
    await expect(
      page.getByText("Con tu contacto, los profesionales pueden responderte por WhatsApp."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
    await expect(page.getByText("o con tu email")).toBeVisible();
    for (const etiqueta of ["Nombre y apellido", "Celular de WhatsApp", "Email"]) {
      await expect(page.getByLabel(etiqueta)).toBeVisible();
    }
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "Tu barrio" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(7); // sin Supabase no hay "Otro barrio"
    await expect(
      page.getByText("Tu dirección exacta nunca se muestra. Solo tu barrio."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terminos");
    await expect(page.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  test("el panel de beneficios aparece solo en escritorio", async ({ page }) => {
    await page.goto("/registro/cliente");
    const panel = page.getByRole("complementary", { name: "Beneficios de crear tu cuenta" });
    const ancho = page.viewportSize()?.width ?? 0;
    if (ancho >= 1024) {
      await expect(panel).toBeVisible();
      await expect(panel.getByText("Contacto directo por WhatsApp")).toBeVisible();
      await expect(panel.getByText("Sin costo")).toBeVisible();
      const formulario = await page.getByLabel("Email").boundingBox();
      const caja = await panel.boundingBox();
      expect(caja!.x).toBeGreaterThan(formulario!.x + formulario!.width);
    } else {
      await expect(panel).toBeHidden();
    }
  });

  test("no deja terminar sin WhatsApp ni barrio y avisa al lado de cada campo", async ({
    page,
  }) => {
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre y apellido").fill("Laura Fernández");
    await page.getByLabel("Email").fill("laura@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("unaclave123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Ingresá tu número de WhatsApp.")).toBeVisible();
    await expect(page.getByText("Elegí tu barrio.")).toBeVisible();
    await expect(page.getByLabel("Celular de WhatsApp")).toHaveAttribute("aria-invalid", "true");
  });

  test("un celular mal escrito muestra el ejemplo", async ({ page }) => {
    await page.goto("/registro/cliente");
    await page.getByLabel("Celular de WhatsApp").fill("12345");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Revisá el número. Ej.: 223 555 1234")).toBeVisible();
  });

  test("la contraseña se puede mostrar y ocultar", async ({ page }) => {
    await page.goto("/registro/cliente");
    const campo = page.getByLabel("Contraseña", { exact: true });
    await campo.fill("unaclave123");
    await expect(campo).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(campo).toHaveAttribute("type", "text");
  });

  test("elegir un barrio lo deja marcado", async ({ page }) => {
    await page.goto("/registro/cliente");
    const chip = page.getByRole("radio", { name: "La Perla" });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-checked", "true");
  });

  test("sin sesión, completar datos manda a ingresar", async ({ page }) => {
    await page.goto("/registro/cliente/completar");
    await expect(page).toHaveURL(/\/ingresar\?volver=/);
  });

  test("sin violaciones de axe", async ({ page }) => {
    await page.goto("/registro/cliente");
    await page.waitForLoadState("networkidle");
    const resultado = await new AxeBuilder({ page }).analyze();
    expect(resultado.violations).toEqual([]);
  });
});

test.describe("registro de cliente con Supabase real", () => {
  test.skip(process.env.E2E_AUTH !== "1", "Necesita Supabase real (E2E_AUTH=1).");

  test("crea la cuenta con email, WhatsApp y barrio, y entra a /inicio", async ({ page }) => {
    const email = `e2e+${Date.now()}@example.com`;
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre y apellido").fill("Laura Fernández de Paz");
    await page.getByLabel("Celular de WhatsApp").fill("(0223) 15 555-1234");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-de-prueba-123");
    await page.getByRole("radio", { name: "Chauvín" }).click();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/inicio$/);

    // El mismo email otra vez: aviso con link a ingresar.
    await page.context().clearCookies();
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre y apellido").fill("Laura Fernández");
    await page.getByLabel("Celular de WhatsApp").fill("2235551234");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-de-prueba-123");
    await page.getByRole("radio", { name: "Centro" }).click();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText(/Ya hay una cuenta con ese email/)).toBeVisible();
    await expect(page.getByRole("link", { name: "ingresar" })).toHaveAttribute("href", "/ingresar");
  });
});
