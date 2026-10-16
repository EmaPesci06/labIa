import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// LAB-53: los campos libres públicos no aceptan teléfonos, emails ni direcciones. Este spec muestra el
// error al lado del campo en el formulario de perfil del profesional, con un Supabase FALSO
// (tests/e2e/apoyo/supabase-falso.cjs). Para correrlo, igual que perfil-datos:
//   1. node tests/e2e/apoyo/supabase-falso.cjs                       (puerto 54399)
//   2. construir y levantar con NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 y una anon key cualquiera
//   3. LABIA_E2E_SUPABASE_FALSO=1 pnpm exec playwright test contenido-publico
// Sin esa variable se saltea: no corre contra el Supabase real del CI.

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

const MENSAJE_CONTENIDO =
  "No pongas teléfonos, emails ni direcciones: el contacto es por WhatsApp desde la app.";

const base64url = (texto: string) => Buffer.from(texto).toString("base64url");

/** Cookie de sesión de @supabase/ssr con el token del profesional dueño del perfil en revisión. */
async function iniciarSesionProfesional(contexto: BrowserContext, baseURL: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: "tok-dueno",
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { id: "x", aud: "authenticated", role: "authenticated" },
  };
  await contexto.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${base64url(JSON.stringify(sesion))}`,
      url: baseURL,
    },
  ]);
}

async function capturar(page: Page, nombre: string, tema: "claro" | "oscuro") {
  if (!DIR_CAPTURAS) return;
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: `${DIR_CAPTURAS}/${nombre}-${ancho}-${tema}.png`,
    fullPage: true,
  });
}

test.describe("campos libres del perfil: sin datos de contacto (LAB-53)", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesionProfesional(context, baseURL ?? "");
  });

  test("claro: un teléfono en «Contá cómo trabajás» muestra el error junto al campo", async ({
    page,
  }) => {
    await page.goto("/cuenta/perfil");
    await page
      .getByLabel("Contá cómo trabajás")
      .fill("Hago instalaciones de gas. Llamame al 223 555-1234 que te paso presupuesto.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    const error = page.getByText(MENSAJE_CONTENIDO);
    await expect(error).toBeVisible();
    await capturar(page, "contenido-publico-error", "claro");
  });

  test("claro: una dirección en «Disponibilidad» muestra el mismo error", async ({ page }) => {
    await page.goto("/cuenta/perfil");
    await page.getByLabel("Disponibilidad").fill("Atiendo en Av. Colón 1234, timbre 2");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText(MENSAJE_CONTENIDO)).toBeVisible();
  });
});

test.describe("modo oscuro del error (LAB-53)", () => {
  test.use({ colorScheme: "dark" });

  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesionProfesional(context, baseURL ?? "");
  });

  test("oscuro: el error se lee con el mismo contraste", async ({ page }) => {
    await page.goto("/cuenta/perfil");
    await page
      .getByLabel("Contá cómo trabajás")
      .fill("Hago instalaciones de gas. Llamame al 223 555-1234 que te paso presupuesto.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText(MENSAJE_CONTENIDO)).toBeVisible();
    await capturar(page, "contenido-publico-error", "oscuro");
  });
});
