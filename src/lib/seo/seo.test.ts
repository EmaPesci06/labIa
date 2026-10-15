import { describe, expect, it } from "vitest";

import { construirRobots } from "./robots";
import { RUTAS_PRIVADAS, RUTAS_PUBLICAS_SITEMAP } from "./rutas";
import { construirSitemap } from "./sitemap";

const SITIO = "https://labia.com.ar";

describe("robots", () => {
  it("en producción bloquea las rutas privadas y apunta al sitemap", () => {
    const reglas = construirRobots({ vercelEnv: "production", sitio: SITIO });
    expect(reglas.rules).toMatchObject({ userAgent: "*", allow: "/" });
    const bloqueadas = (reglas.rules as { disallow: string[] }).disallow;
    for (const ruta of ["/admin", "/cuenta", "/api"]) expect(bloqueadas).toContain(ruta);
    expect(reglas.sitemap).toBe(`${SITIO}/sitemap.xml`);
  });

  it("en un preview de Vercel no se indexa nada", () => {
    const reglas = construirRobots({ vercelEnv: "preview", sitio: "https://x.vercel.app" });
    expect(reglas.rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});

describe("sitemap", () => {
  it("incluye la home, las búsquedas por oficio y los perfiles publicados", () => {
    const entradas = construirSitemap(SITIO, ["abc-123"]).map((e) => e.url);
    expect(entradas).toContain(`${SITIO}/`);
    expect(entradas).toContain(`${SITIO}/buscar?oficio=gas`);
    expect(entradas).toContain(`${SITIO}/profesionales/abc-123`);
  });

  it("nunca incluye rutas privadas ni endpoints", () => {
    const entradas = construirSitemap(SITIO, ["abc-123"]).map((e) => e.url);
    for (const entrada of entradas) {
      expect(entrada).not.toMatch(/\/(admin|cuenta|api|inicio|mis-trabajos|trabajos)(\/|$|\?)/);
    }
  });

  it("las rutas públicas y privadas no se superponen", () => {
    for (const ruta of RUTAS_PUBLICAS_SITEMAP) {
      expect(RUTAS_PRIVADAS).not.toContain(ruta);
    }
  });
});
