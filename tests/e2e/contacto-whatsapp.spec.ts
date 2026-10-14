import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// LAB-25: contacto por WhatsApp desde el perfil, con el Supabase FALSO (tests/e2e/apoyo/supabase-falso.cjs).
// Cubre los errores de la Server Action (límite diario y profesional no disponible), el teclado de la
// hoja "Antes de contactar" (foco atrapado, Esc, foco que vuelve al botón) y el tamaño del botón verde.
// Para correr: ver perfil-datos.spec.ts (mismo servidor falso y mismos puertos).
// Sin LABIA_E2E_SUPABASE_FALSO=1 se saltean: no pueden correr contra el Supabase real del CI.

const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const DIR_CAPTURAS = process.env.LABIA_CAPTURAS_DIR;

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const WHATSAPP_FALSO = "5492235550123";
const NOMBRE_HOJA = "Antes de contactar";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

type Token = "tok-cliente" | "tok-cliente-limite" | "tok-cliente-despublicado";

const base64url = (texto: string) => Buffer.from(texto).toString("base64url");

/** Cookie de sesión de @supabase/ssr (`sb-<host>-auth-token`); el falso reconoce el access_token. */
async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: Token) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: token,
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

/** El botón "Contactar por WhatsApp" visible del perfil (celular: uno solo; escritorio: puede haber dos). */
const botonContactar = (page: Page) =>
  page.getByRole("button", { name: "Contactar por WhatsApp" }).filter({ visible: true }).first();

/** Foco dentro del diálogo abierto (la comprobación de foco no tiene rol accesible equivalente). */
const focoDentroDeLaHoja = (page: Page) =>
  page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));

test.describe("contacto: errores de la acción", () => {
  test("límite diario: avisa en la hoja, no abre nada y deja volver a intentar", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-cliente-limite");
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    const pestanasAntes = context.pages().length;

    await botonContactar(page).click();
    const hoja = page.getByRole("dialog", { name: NOMBRE_HOJA });
    await expect(hoja).toBeVisible();
    await hoja.getByRole("button", { name: "Abrir WhatsApp" }).click();

    await expect(hoja.getByRole("alert")).toHaveText(
      "Llegaste al máximo de contactos por hoy. Probá mañana.",
    );
    // La hoja sigue abierta y el botón vuelve a estar disponible: el error no la cierra.
    await expect(hoja).toBeVisible();
    await expect(hoja.getByRole("button", { name: "Abrir WhatsApp" })).toBeEnabled();
    // La pestaña que se abrió para WhatsApp se cierra si no hay link.
    await expect.poll(() => context.pages().length).toBe(pestanasAntes);
    expect(await page.content()).not.toContain(WHATSAPP_FALSO);
    await capturar(page, "contacto-error-limite", "claro");
  });

  test("profesional que ya no está disponible: mensaje en castellano junto al botón", async ({
    page,
    context,
    baseURL,
  }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-cliente-despublicado");
    await page.goto(`/profesionales/${ID_PUBLICADO}`);

    await botonContactar(page).click();
    const hoja = page.getByRole("dialog", { name: NOMBRE_HOJA });
    await hoja.getByRole("button", { name: "Abrir WhatsApp" }).click();

    await expect(hoja.getByRole("alert")).toHaveText("Ese profesional ya no está disponible.");
    await expect(hoja.getByRole("button", { name: "Abrir WhatsApp" })).toHaveAttribute(
      "aria-describedby",
      "error-contacto",
    );
    expect(await page.content()).not.toContain(WHATSAPP_FALSO);
  });
});

test.describe("contacto: teclado y foco", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, baseURL ?? "", "tok-cliente");
  });

  test("Enter abre la hoja con el foco adentro, Tab no lo escapa, Esc cierra y el foco vuelve al botón", async ({
    page,
  }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    const boton = botonContactar(page);
    await boton.focus();
    await page.keyboard.press("Enter");

    const hoja = page.getByRole("dialog", { name: NOMBRE_HOJA });
    await expect(hoja).toBeVisible();
    await expect.poll(() => focoDentroDeLaHoja(page)).toBe(true);

    // Recorremos el diálogo dando varias vueltas de Tab: el foco no sale hacia la página de atrás.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await focoDentroDeLaHoja(page)).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(hoja).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test("Cancelar cierra la hoja y el foco vuelve al botón de contacto", async ({ page }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    const boton = botonContactar(page);
    await boton.click();
    const hoja = page.getByRole("dialog", { name: NOMBRE_HOJA });
    await expect(hoja).toBeVisible();

    await hoja.getByRole("button", { name: "Cancelar" }).click();
    await expect(hoja).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test("el botón verde de la hoja mide al menos 52 px de alto", async ({ page }) => {
    await page.goto(`/profesionales/${ID_PUBLICADO}`);
    await botonContactar(page).click();
    const hoja = page.getByRole("dialog", { name: NOMBRE_HOJA });
    await expect(hoja).toBeVisible();

    const abrir = hoja.getByRole("button", { name: "Abrir WhatsApp" });
    const caja = await abrir.boundingBox();
    expect(caja?.height).toBeGreaterThanOrEqual(52);
    await capturar(page, "contacto-hoja-teclado", "claro");
  });
});
