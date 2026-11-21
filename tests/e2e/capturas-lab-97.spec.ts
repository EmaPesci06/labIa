import { tokenJwt } from "./apoyo/token";
import { esperarColoresEstables } from "./apoyo/hoja";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// LAB-97: capturas de todas las rutas de AGENTS.md a 390 y 1440 px, en claro y oscuro, en
// docs/capturas/lab-97/. No es una prueba de comportamiento: se salta salvo con LABIA_CAPTURAS=1 y
// el Supabase falso (LABIA_E2E_SUPABASE_FALSO=1), con los mismos tres servidores que pase-final.

const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_BASE = `http://localhost:${PUERTO}`;
const URL_PROFESIONAL = `http://localhost:${PUERTO + 100}`;
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;
const ACTIVO = process.env.LABIA_E2E_SUPABASE_FALSO === "1" && process.env.LABIA_CAPTURAS === "1";
const DIR = join(process.cwd(), "docs/capturas/lab-97");

const ID_PUBLICADO = "11111111-1111-4111-8111-111111111111";
const ID_EN_REVISION = "22222222-2222-4222-8222-222222222222";
const TRABAJO_OLOR_GAS = "88888888-8888-4888-8888-888888888881";

const ESQUEMAS = [
  ["claro", "light"],
  ["oscuro", "dark"],
] as const;

type Grupo = { nombre: string; baseURL: string; rutas: string[]; sesion?: string };

const GRUPOS: Grupo[] = [
  {
    nombre: "anonimo",
    baseURL: URL_BASE,
    rutas: [
      "/",
      "/ingresar",
      "/registro/cliente",
      "/registro/profesional",
      "/normas",
      "/terminos",
      "/privacidad",
    ],
  },
  {
    nombre: "cliente",
    baseURL: URL_CLIENTE,
    rutas: [
      "/inicio",
      "/buscar?oficio=gas",
      `/profesionales/${ID_PUBLICADO}`,
      "/trabajos/nuevo",
      "/mis-trabajos",
      `/mis-trabajos/${TRABAJO_OLOR_GAS}`,
      "/cuenta",
    ],
  },
  {
    nombre: "profesional",
    baseURL: URL_PROFESIONAL,
    rutas: ["/trabajos", `/trabajos/${TRABAJO_OLOR_GAS}`, "/mis-trabajos", "/cuenta"],
  },
  {
    nombre: "admin",
    baseURL: URL_BASE,
    sesion: "tok-admin",
    rutas: ["/admin/verificaciones", `/admin/verificaciones/${ID_EN_REVISION}`, "/admin/reportes"],
  },
];

async function sesionFalsa(contexto: BrowserContext, baseURL: string, token: string) {
  const sesion = {
    access_token: tokenJwt(token),
    refresh_token: "refresh-falso",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
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

const nombreArchivo = (ruta: string) =>
  (ruta === "/" ? "inicio-publico" : ruta.replace(/^\//, ""))
    .replace(/[?=&]/g, "-")
    .replace(/\//g, "_")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "id");

async function capturar(page: Page, ruta: string, tema: string, prefijo: string) {
  mkdirSync(DIR, { recursive: true });
  const ancho = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: join(DIR, `${prefijo}${nombreArchivo(ruta)}-${ancho}-${tema}.png`),
    fullPage: true,
  });
}

test.describe("capturas LAB-97", () => {
  test.skip(!ACTIVO, "Necesita LABIA_CAPTURAS=1 y el Supabase falso");

  for (const grupo of GRUPOS) {
    for (const [tema, esquema] of ESQUEMAS) {
      test(`${grupo.nombre} (${tema})`, async ({ browser }, testInfo) => {
        const escritorio = testInfo.project.name === "escritorio";
        const contexto = await browser.newContext({
          viewport: escritorio ? { width: 1440, height: 900 } : { width: 390, height: 844 },
          isMobile: !escritorio,
          hasTouch: !escritorio,
          locale: "es-AR",
          timezoneId: "America/Argentina/Buenos_Aires",
        });
        const sesion =
          grupo.sesion ?? (grupo.nombre === "anonimo" || grupo.nombre === "admin" ? undefined : "");
        if (sesion) await sesionFalsa(contexto, grupo.baseURL, sesion);
        const page = await contexto.newPage();
        await page.emulateMedia({ colorScheme: esquema });
        for (const ruta of grupo.rutas) {
          const respuesta = await page.goto(`${grupo.baseURL}${ruta}`);
          expect(respuesta?.status(), `respuesta de ${ruta}`).toBeLessThan(400);
          await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
          await page.waitForLoadState("networkidle");
          await esperarColoresEstables(page);
          await capturar(page, ruta, tema, grupo.nombre === "profesional" ? "profesional-" : "");
        }
        await contexto.close();
      });
    }
  }
});
