import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext } from "@playwright/test";

// LAB-17 / LAB-76: registro de cliente. Estas pruebas no dependen de que el servidor tenga Supabase: solo
// miran la pantalla y la validación; el registro completo corre con E2E_AUTH=1 (proyecto de desarrollo
// con confirmación de email desactivada).

const CON_FALSO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";

/** Cookie de sesión de un cliente que entró con Google y todavía no aceptó los términos. */
async function entrarSinTerminos(context: BrowserContext, baseURL: string) {
  const sesion = {
    access_token: "tok-cliente-sin-terminos",
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "x", aud: "authenticated", role: "authenticated" },
  };
  await context.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`,
      url: baseURL,
    },
  ]);
}

test.describe("registro de cliente", () => {
  test("muestra la pantalla del prototipo", async ({ page }) => {
    await page.goto("/registro/cliente");
    await expect(page.getByRole("link", { name: "Volver" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("heading", { level: 1, name: "Creá tu cuenta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Seguir con Google" })).toBeVisible();
    for (const etiqueta of ["Nombre", "Email", "Tu WhatsApp", "Tu barrio"]) {
      await expect(page.getByLabel(etiqueta)).toBeVisible();
    }
    await expect(page.getByLabel("Contraseña", { exact: true })).toBeVisible();
    const selectorBarrio = page.getByRole("combobox", { name: "Tu barrio" });
    await expect(selectorBarrio).toBeVisible();
    // Los 7 barrios más comunes están siempre disponibles en el selector.
    for (const barrio of [
      "La Perla",
      "Centro",
      "Chauvín",
      "Los Troncos",
      "Punta Mogotes",
      "Constitución",
      "Puerto",
    ]) {
      await expect(selectorBarrio.getByRole("option", { name: barrio })).toBeAttached();
    }
    await expect(page.getByText("Nunca te pedimos la dirección.")).toBeVisible();
    await expect(page.getByText("Lo ven solo los profesionales que elijas.")).toBeVisible();
    await expect(
      page.locator("#contenido").getByRole("link", { name: "términos" }),
    ).toHaveAttribute("href", "/terminos");
    await expect(
      page.locator("#contenido").getByRole("link", { name: "privacidad" }),
    ).toHaveAttribute("href", "/privacidad");
  });

  test("muestra el link para registrarse como profesional", async ({ page }) => {
    await page.goto("/registro/cliente");
    const enlace = page.getByRole("link", {
      name: "¿Ofrecés un oficio? Registrate como profesional",
    });
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute("href", "/registro/profesional");
  });

  test("el formulario se mantiene en una columna centrada en escritorio", async ({ page }) => {
    await page.goto("/registro/cliente");
    const contenedor = await page.locator("#contenido").boundingBox();
    expect(contenedor!.width).toBeLessThanOrEqual(560);
  });

  test("no deja terminar sin WhatsApp ni barrio y avisa al lado de cada campo", async ({
    page,
  }) => {
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre").fill("Laura Fernández");
    await page.getByLabel("Email").fill("laura@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("unaclave123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Ingresá tu número de WhatsApp.")).toBeVisible();
    await expect(page.getByText("Elegí tu barrio.")).toBeVisible();
    await expect(page.getByLabel("Tu WhatsApp")).toHaveAttribute("aria-invalid", "true");
  });

  test("la casilla de mayor de 18 y términos arranca sin tildar y es obligatoria", async ({
    page,
  }) => {
    await page.goto("/registro/cliente");
    const casilla = page.getByRole("checkbox", { name: /mayor de 18/ });
    await expect(casilla).not.toBeChecked();
    await page.getByLabel("Nombre").fill("Laura Fernández");
    await page.getByLabel("Email").fill("laura@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("unaclave123");
    await page.getByLabel("Tu WhatsApp").fill("223 555 1234");
    await page.getByLabel("Tu barrio").selectOption({ label: "Centro" });
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(
      page.getByText("Para crear la cuenta tenés que confirmar que sos mayor de 18"),
    ).toBeVisible();
    await expect(casilla).toHaveAttribute("aria-invalid", "true");
    await expect(casilla).toHaveAccessibleDescription(/mayor de 18/);
  });

  test("un celular mal escrito muestra el ejemplo", async ({ page }) => {
    await page.goto("/registro/cliente");
    await page.getByLabel("Tu WhatsApp").fill("12345");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Revisá el número. Ej.: 223 555 1234")).toBeVisible();
  });

  test("la contraseña se puede mostrar y ocultar", async ({ page }) => {
    await page.goto("/registro/cliente");
    const campo = page.getByLabel("Contraseña", { exact: true });
    await campo.fill("unaclave123");
    await expect(campo).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Ver contraseña" }).click();
    await expect(campo).toHaveAttribute("type", "text");
  });

  test("elegir un barrio actualiza el selector", async ({ page }) => {
    await page.goto("/registro/cliente");
    const selector = page.getByRole("combobox", { name: "Tu barrio" });
    await selector.selectOption({ label: "La Perla" });
    await expect(selector).toHaveValue("51");
  });

  test("sin sesión, completar datos manda a ingresar", async ({ page }) => {
    await page.goto("/registro/cliente/completar");
    await expect(page).toHaveURL(/\/ingresar\?volver=/);
  });

  test("el alta con Google no saltea la casilla de mayor de 18 y términos", async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(!CON_FALSO, "Necesita el Supabase falso (sesión de cliente sin el alta completa).");
    await entrarSinTerminos(context, baseURL as string);
    await page.goto("/registro/cliente/completar");
    const casilla = page.getByRole("checkbox", { name: /mayor de 18/ });
    await expect(casilla).not.toBeChecked();
    await page.getByLabel("Tu WhatsApp").fill("223 555 1234");
    await page.getByLabel("Tu barrio").selectOption({ label: "Centro" });
    await page.getByRole("button", { name: "Terminar" }).click();
    await expect(
      page.getByText("Para crear la cuenta tenés que confirmar que sos mayor de 18"),
    ).toBeVisible();
    await expect(casilla).toHaveAttribute("aria-invalid", "true");
    await expect(casilla).toHaveAccessibleDescription(/mayor de 18/);
    await expect(page).toHaveURL(/\/registro\/cliente\/completar/);
  });

  // LAB-81: el consentimiento es un dato del servidor; "Un último paso" no se puede esquivar yendo
  // directo a otra pantalla.
  test("un cliente sin mayor de 18 y términos no pasa de 'Un último paso'", async ({
    page,
    context,
    baseURL,
  }) => {
    test.skip(!CON_FALSO, "Necesita el Supabase falso (sesión de cliente sin el alta completa).");
    await entrarSinTerminos(context, baseURL as string);
    for (const ruta of [
      "/inicio",
      "/buscar",
      "/trabajos/nuevo",
      "/mis-trabajos",
      "/cuenta/datos",
    ]) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/registro\/cliente\/completar/);
    }
    await expect(page.getByRole("heading", { level: 1, name: "Un último paso" })).toBeVisible();
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
    await page.getByLabel("Nombre").fill("Laura Fernández de Paz");
    await page.getByLabel("Tu WhatsApp").fill("(0223) 15 555-1234");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-de-prueba-123");
    await page.getByLabel("Tu barrio").selectOption({ label: "Chauvín" });
    await page.getByLabel(/mayor de 18/).check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/inicio$/);

    // El mismo email otra vez: no revela si existe y responde igual que un alta pendiente.
    await page.context().clearCookies();
    await page.goto("/registro/cliente");
    await page.getByLabel("Nombre").fill("Laura Fernández");
    await page.getByLabel("Tu WhatsApp").fill("2235551234");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-de-prueba-123");
    await page.getByLabel("Tu barrio").selectOption({ label: "Centro" });
    await page.getByLabel(/mayor de 18/).check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText(`Te mandamos un mail a ${email}.`)).toBeVisible();
    await expect(page.getByText(/Ya hay una cuenta con ese email/)).toHaveCount(0);
  });
});
