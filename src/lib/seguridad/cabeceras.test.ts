import { describe, expect, it } from "vitest";

import { cabecerasDeSeguridad, origenDe, politicaCsp } from "./cabeceras";

const produccion = {
  desarrollo: false,
  urlSupabase: "https://abcd.supabase.co/",
  dsnSentry: "https://clave@o123.ingest.us.sentry.io/456",
  hostPosthog: "https://us.i.posthog.com",
};

function directiva(politica: string, nombre: string): string[] {
  const encontrada = politica
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${nombre} `));
  return encontrada ? encontrada.split(" ").slice(1) : [];
}

describe("origenDe", () => {
  it("devuelve solo el origen, sin ruta ni barra final", () => {
    expect(origenDe("https://abcd.supabase.co/rest/v1/")).toBe("https://abcd.supabase.co");
  });

  it("devuelve null si falta o no es una URL", () => {
    expect(origenDe(undefined)).toBeNull();
    expect(origenDe("no es una url")).toBeNull();
  });
});

describe("politicaCsp", () => {
  it("bloquea el enmarcado y el uso de plugins", () => {
    const politica = politicaCsp(produccion);
    expect(directiva(politica, "frame-ancestors")).toEqual(["'none'"]);
    expect(directiva(politica, "object-src")).toEqual(["'none'"]);
    expect(directiva(politica, "base-uri")).toEqual(["'self'"]);
  });

  it("habilita Supabase (REST y realtime), Sentry y PostHog en connect-src", () => {
    const conexion = directiva(politicaCsp(produccion), "connect-src");
    expect(conexion).toEqual(
      expect.arrayContaining([
        "'self'",
        "https://abcd.supabase.co",
        "wss://abcd.supabase.co",
        "https://o123.ingest.us.sentry.io",
        "https://us.i.posthog.com",
      ]),
    );
  });

  it("permite embeber Supabase en frame-src (visor de PDF del admin) y nada más", () => {
    expect(directiva(politicaCsp(produccion), "frame-src")).toEqual([
      "'self'",
      "https://abcd.supabase.co",
    ]);
  });

  it("permite las imágenes de Supabase Storage y data/blob (vista previa de fotos)", () => {
    expect(directiva(politicaCsp(produccion), "img-src")).toEqual(
      expect.arrayContaining(["'self'", "data:", "blob:", "https://abcd.supabase.co"]),
    );
  });

  it("no usa nonce ni eval en producción", () => {
    const politica = politicaCsp(produccion);
    expect(politica).not.toContain("nonce-");
    expect(directiva(politica, "script-src")).not.toContain("'unsafe-eval'");
  });

  it("agrega eval y websocket de HMR solo en desarrollo", () => {
    const politica = politicaCsp({ ...produccion, desarrollo: true });
    expect(directiva(politica, "script-src")).toContain("'unsafe-eval'");
    expect(directiva(politica, "connect-src")).toEqual(expect.arrayContaining(["ws:", "wss:"]));
  });

  it("permite el ingreso con Google en form-action (Supabase y accounts.google.com)", () => {
    expect(directiva(politicaCsp(produccion), "form-action")).toEqual(
      expect.arrayContaining(["'self'", "https://abcd.supabase.co", "https://accounts.google.com"]),
    );
  });

  it("omite los hosts que no están configurados, sin dejar valores vacíos", () => {
    const politica = politicaCsp({ desarrollo: false });
    expect(politica).not.toMatch(/\s{2}|undefined|null/);
    expect(directiva(politica, "connect-src")).toEqual(["'self'", "https://us.i.posthog.com"]);
  });
});

describe("cabecerasDeSeguridad", () => {
  const cabeceras = Object.fromEntries(
    cabecerasDeSeguridad(produccion).map((c) => [c.key, c.value]),
  );

  it("incluye las cabeceras globales pedidas en LAB-55", () => {
    expect(cabeceras["X-Frame-Options"]).toBe("DENY");
    expect(cabeceras["X-Content-Type-Options"]).toBe("nosniff");
    expect(cabeceras["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(cabeceras["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("deshabilita cámara, micrófono y geolocalización", () => {
    expect(cabeceras["Permissions-Policy"]).toContain("camera=()");
    expect(cabeceras["Permissions-Policy"]).toContain("microphone=()");
    expect(cabeceras["Permissions-Policy"]).toContain("geolocation=()");
  });
});
