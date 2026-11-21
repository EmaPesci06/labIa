import { tokenJwt } from "./apoyo/token";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { reiniciarFalso } from "./apoyo/reiniciar-falso";

const DIR = join(process.cwd(), "docs/capturas/lab-78");
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1";
const TRABAJO_ID = "88888888-8888-4888-8888-888888888881";

test.skip(!ACTIVO, "Necesita el Supabase falso: LABIA_E2E_SUPABASE_FALSO=1");

const ESQUEMAS = [
  ["claro", "light"],
  ["oscuro", "dark"],
] as const;

async function iniciarSesion(contexto: BrowserContext, baseURL: string, token: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sesion = {
    access_token: tokenJwt(token),
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { id: "x", aud: "authenticated", role: "authenticated" },
  };
  await contexto.addCookies([
    {
      name: "sb-localhost-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(sesion)).toString("base64url")}`,
      url: baseURL,
    },
  ]);
}

async function capturar(page: Page, nombre: string, tema: string) {
  mkdirSync(DIR, { recursive: true });
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: join(DIR, `${nombre}-${ancho}-${tema}.png`),
    fullPage: true,
  });
}

test.describe("capturas LAB-78", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await reiniciarFalso();
  });

  for (const [tema, esquema] of ESQUEMAS) {
    test(`capturar trabajos (${tema})`, async ({ browser, baseURL }, testInfo) => {
      const ancho = testInfo.project.name === "escritorio" ? 1440 : 390;
      const alto = testInfo.project.name === "escritorio" ? 900 : 844;
      const contexto = await browser.newContext({
        viewport: { width: ancho, height: alto },
        locale: "es-AR",
        colorScheme: esquema,
      });
      await iniciarSesion(contexto, baseURL!, "tok-dueno");
      const page = await contexto.newPage();
      await page.goto("/trabajos");
      await expect(
        page.getByRole("heading", { level: 1, name: "Trabajos para vos" }),
      ).toBeVisible();
      await capturar(page, "trabajos", tema);
      await contexto.close();
    });

    test(`capturar trabajo detalle (${tema})`, async ({ browser, baseURL }, testInfo) => {
      const ancho = testInfo.project.name === "escritorio" ? 1440 : 390;
      const alto = testInfo.project.name === "escritorio" ? 900 : 844;
      const contexto = await browser.newContext({
        viewport: { width: ancho, height: alto },
        locale: "es-AR",
        colorScheme: esquema,
      });
      await iniciarSesion(contexto, baseURL!, "tok-dueno");
      const page = await contexto.newPage();
      await page.goto(`/trabajos/${TRABAJO_ID}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Olor a gas en la cocina" }),
      ).toBeVisible();
      await capturar(page, "trabajo-detalle", tema);
      await contexto.close();
    });

    test(`capturar postulaciones (${tema})`, async ({ browser, baseURL }, testInfo) => {
      const ancho = testInfo.project.name === "escritorio" ? 1440 : 390;
      const alto = testInfo.project.name === "escritorio" ? 900 : 844;
      const contexto = await browser.newContext({
        viewport: { width: ancho, height: alto },
        locale: "es-AR",
        colorScheme: esquema,
      });
      await iniciarSesion(contexto, baseURL!, "tok-dueno");
      const page = await contexto.newPage();
      await page.goto("/trabajos?vista=mias");
      await expect(
        page.getByRole("heading", { level: 1, name: "Mis postulaciones" }),
      ).toBeVisible();
      await capturar(page, "postulaciones", tema);
      await contexto.close();
    });
  }
});
