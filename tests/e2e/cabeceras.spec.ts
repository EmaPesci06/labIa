import { expect, test, type Page } from "@playwright/test";

// Cabeceras de seguridad en respuestas reales (LAB-55, H-01 de LAB-34). Y ninguna violación de CSP
// en las páginas que visitamos: la CSP no puede romper nada que la suite ya prueba.
const PUERTO = Number(process.env.PUERTO_E2E ?? 3000);
const URL_CLIENTE = `http://localhost:${PUERTO + 200}`;

const RUTAS_PUBLICAS = [
  "/",
  "/ingresar",
  "/registro",
  "/normas",
  "/terminos",
  "/privacidad",
  "/buscar",
];

type VentanaCsp = Window & { __violacionesCsp?: string[] };

async function leerViolaciones(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as VentanaCsp).__violacionesCsp ?? []);
}

test.describe("cabeceras de seguridad", () => {
  test("las respuestas traen CSP, anti-framing y permisos restringidos", async ({ request }) => {
    const respuesta = await request.get("/ingresar");
    expect(respuesta.status()).toBe(200);

    const cabeceras = respuesta.headers();
    expect(cabeceras["x-frame-options"]).toBe("DENY");
    expect(cabeceras["x-content-type-options"]).toBe("nosniff");
    expect(cabeceras["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(cabeceras["permissions-policy"]).toContain("camera=()");
    expect(cabeceras["permissions-policy"]).toContain("geolocation=()");

    const csp = cabeceras["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("nonce-");
  });

  test("el service worker conserva su cabecera propia", async ({ request }) => {
    const respuesta = await request.get("/sw.js");
    expect(respuesta.headers()["service-worker-allowed"]).toBe("/");
    expect(respuesta.headers()["cache-control"]).toContain("no-store");
  });

  test("las páginas públicas no disparan violaciones de CSP", async ({ page }) => {
    await page.addInitScript(() => {
      const violaciones: string[] = [];
      Object.defineProperty(window, "__violacionesCsp", { value: violaciones });
      document.addEventListener("securitypolicyviolation", (evento) => {
        violaciones.push(`${evento.violatedDirective} ${evento.blockedURI}`);
      });
    });

    const violaciones: string[] = [];
    for (const ruta of RUTAS_PUBLICAS) {
      await page.goto(ruta, { waitUntil: "networkidle" });
      violaciones.push(...(await leerViolaciones(page)));
    }
    expect(violaciones).toEqual([]);
  });

  test("las pantallas de la app (cliente) no disparan violaciones de CSP", async ({ page }) => {
    await page.addInitScript(() => {
      const violaciones: string[] = [];
      Object.defineProperty(window, "__violacionesCsp", { value: violaciones });
      document.addEventListener("securitypolicyviolation", (evento) => {
        violaciones.push(`${evento.violatedDirective} ${evento.blockedURI}`);
      });
    });

    const violaciones: string[] = [];
    for (const ruta of ["/inicio", "/mis-trabajos", "/cuenta"]) {
      await page.goto(`${URL_CLIENTE}${ruta}`, { waitUntil: "networkidle" });
      violaciones.push(...(await leerViolaciones(page)));
    }
    expect(violaciones).toEqual([]);
  });
});
