import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// LAB-34 · capturas pendientes: LAB-52 (detalle del trabajo), LAB-53 (error de dato de contacto junto al
// campo) y LAB-54 (mensaje de límite). Solo corre con LABIA_CAPTURAS_DIR; sin esa variable se saltea.
// Salida: <LABIA_CAPTURAS_DIR>/<nombre>-<ancho>-<claro|oscuro>.png, a 390 y 1440 px (según el proyecto).

const DIR = process.env.LABIA_CAPTURAS_DIR;
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1" && Boolean(DIR);
const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_BASE = `http://localhost:${PUERTO}`;
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const TRABAJO_OLOR_GAS = "88888888-8888-4888-8888-888888888881";
const ESQUEMAS = [
  ["claro", "light"],
  ["oscuro", "dark"],
] as const;

const base64url = (texto: string) => Buffer.from(texto).toString("base64url");

/** Sesión de @supabase/ssr contra el falso en el servidor base (mismo formato que los otros specs). */
async function iniciarSesion(contexto: BrowserContext, token: string) {
  const sesion = {
    access_token: token,
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "x", aud: "authenticated", role: "authenticated" },
  };
  await contexto.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${base64url(JSON.stringify(sesion))}`,
      url: URL_BASE,
    },
  ]);
}

async function capturar(page: Page, nombre: string, tema: string) {
  mkdirSync(DIR ?? ".", { recursive: true });
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: join(DIR ?? ".", `${nombre}-${ancho}-${tema}.png`),
    fullPage: true,
  });
}

test.describe("capturas LAB-34", () => {
  test.skip(!ACTIVO, "Solo con LABIA_E2E_SUPABASE_FALSO=1 y LABIA_CAPTURAS_DIR");

  for (const [tema, esquema] of ESQUEMAS) {
    test(`LAB-54 · mensaje de límite diario (${tema})`, async ({ browser }) => {
      const contexto = await browser.newContext({ locale: "es-AR", colorScheme: esquema });
      await iniciarSesion(contexto, "tok-cliente-limite");
      const page = await contexto.newPage();
      await page.goto(`${URL_BASE}/profesionales/${ID_PUBLICADO}`);
      await page
        .getByRole("button", { name: "Contactar por WhatsApp" })
        .filter({ visible: true })
        .first()
        .click();
      const hoja = page.getByRole("dialog", { name: "Antes de contactar" });
      await hoja.getByRole("button", { name: "Abrir WhatsApp" }).click();
      await expect(hoja.getByRole("alert")).toHaveText(
        "Llegaste al máximo de contactos por hoy. Probá mañana.",
      );
      await capturar(page, "lab54-limite-contacto", tema);
      await contexto.close();
    });

    test(`LAB-53 · dato de contacto en un campo libre (${tema})`, async ({ browser }) => {
      const contexto = await browser.newContext({ locale: "es-AR", colorScheme: esquema });
      await iniciarSesion(contexto, "tok-resena-nueva");
      const page = await contexto.newPage();
      await page.goto(`${URL_BASE}/profesionales/${ID_PUBLICADO}`);
      await page
        .getByRole("button", { name: "Dejar reseña" })
        .filter({ visible: true })
        .first()
        .click();
      const hoja = page.getByRole("dialog");
      await hoja.getByRole("radio", { name: "Bien" }).click();
      await hoja.getByLabel("Comentario (opcional)").fill("Llamame al 2235551234 para coordinar.");
      await hoja.getByRole("button", { name: "Publicar reseña" }).click();
      await expect(hoja.getByRole("alert")).toContainText("No incluyas números de teléfono");
      await capturar(page, "lab53-error-contacto-campo", tema);
      await contexto.close();
    });

    test(`LAB-52 · detalle del trabajo con fotos firmadas, cliente (${tema})`, async ({
      browser,
    }) => {
      const contexto = await browser.newContext({ locale: "es-AR", colorScheme: esquema });
      await iniciarSesion(contexto, "tok-dueno");
      const page = await contexto.newPage();
      await page.goto(`${URL_BASE}/mis-trabajos/${TRABAJO_OLOR_GAS}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await capturar(page, "lab52-trabajo-cliente", tema);
      await contexto.close();
    });

    test(`LAB-52 · detalle del trabajo con fotos firmadas, profesional (${tema})`, async ({
      browser,
    }) => {
      const contexto = await browser.newContext({ locale: "es-AR", colorScheme: esquema });
      const page = await contexto.newPage();
      await page.goto(`${URL_PROFESIONAL}/trabajos/${TRABAJO_OLOR_GAS}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await capturar(page, "lab52-trabajo-profesional", tema);
      await contexto.close();
    });
  }
});
