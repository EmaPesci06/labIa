import posthog from "posthog-js";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import {
  identificarUsuario,
  iniciarMetricas,
  limpiarCaptura,
  type NombreEvento,
  registrarEvento,
  registrarPaginaVista,
  reiniciarMetricasParaTests,
  urlSinParametros,
} from "./metricas";

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

beforeEach(() => {
  reiniciarMetricasParaTests();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sin NEXT_PUBLIC_POSTHOG_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
  });

  it("no inicializa PostHog ni manda eventos", () => {
    expect(iniciarMetricas()).toBe(false);
    registrarEvento("busqueda_realizada", { oficio: "gas", barrio_id: 3, resultados: 7 });
    registrarPaginaVista("/buscar");
    identificarUsuario({ id: "550e8400-e29b-41d4-a716-446655440000", rol: "cliente" });

    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

describe("con NEXT_PUBLIC_POSTHOG_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_prueba");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://eu.i.posthog.com");
  });

  it("inicializa una sola vez, sin autocapture ni grabación de sesiones", () => {
    iniciarMetricas();
    iniciarMetricas();

    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_prueba",
      expect.objectContaining({
        api_host: "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        autocapture: false,
        capture_pageview: false,
        disable_session_recording: true,
        opt_out_capturing_by_default: false,
      }),
    );
  });

  it("manda el evento con sus propiedades", () => {
    registrarEvento("trabajo_publicado", { oficio: "plomeria", urgencia: "esta_semana" });
    registrarEvento("postulante_elegido");

    expect(posthog.capture).toHaveBeenCalledWith("trabajo_publicado", {
      oficio: "plomeria",
      urgencia: "esta_semana",
    });
    expect(posthog.capture).toHaveBeenCalledWith("postulante_elegido", undefined);
  });

  it("registra la vista de página sin query string", () => {
    registrarPaginaVista("/profesionales/550e8400-e29b-41d4-a716-446655440000");

    expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
      $current_url: `${window.location.origin}/profesionales/550e8400-e29b-41d4-a716-446655440000`,
    });
  });

  it("registra una sola vista por ruta aunque el efecto corra dos veces", () => {
    registrarPaginaVista("/buscar");
    registrarPaginaVista("/buscar");
    registrarPaginaVista("/inicio");

    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });

  it("identifica solo por uuid y rol", () => {
    identificarUsuario({ id: "550e8400-e29b-41d4-a716-446655440000", rol: "profesional" });

    expect(posthog.identify).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", {
      rol: "profesional",
    });
  });
});

describe("urlSinParametros", () => {
  it("saca query string y hash", () => {
    expect(urlSinParametros("https://labia.app/buscar?oficio=gas#arriba")).toBe(
      "https://labia.app/buscar",
    );
    expect(urlSinParametros("https://labia.app/inicio")).toBe("https://labia.app/inicio");
  });
});

describe("limpiarCaptura (before_send de PostHog)", () => {
  it("saca la query de las URLs en propiedades y en $set_once", () => {
    const captura = limpiarCaptura({
      uuid: "1",
      event: "$pageview",
      properties: { $current_url: "https://labia.app/buscar?tel=2235551234", oficio: "gas" },
      $set_once: { $initial_current_url: "https://labia.app/?email=ana%40ejemplo.com" },
    });

    expect(captura?.properties).toEqual({
      $current_url: "https://labia.app/buscar",
      oficio: "gas",
    });
    expect(captura?.$set_once).toEqual({ $initial_current_url: "https://labia.app/" });
  });
});

describe("tipos de registrarEvento", () => {
  it("solo acepta los eventos de la lista del MVP", () => {
    expectTypeOf<NombreEvento>().toEqualTypeOf<
      | "registro_iniciado"
      | "registro_completado"
      | "documentos_enviados"
      | "profesional_verificado"
      | "busqueda_realizada"
      | "perfil_visto"
      | "whatsapp_abierto"
      | "trabajo_publicado"
      | "postulacion_enviada"
      | "postulante_elegido"
      | "resena_publicada"
      | "reporte_enviado"
    >();
  });

  it("rechaza nombres y propiedades fuera de la lista (lo verifica pnpm typecheck)", () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");

    // @ts-expect-error: evento que no está en la lista cerrada
    registrarEvento("boton_tocado");
    // @ts-expect-error: busqueda_realizada necesita oficio, barrio_id y resultados
    registrarEvento("busqueda_realizada", { oficio: "gas" });
    // @ts-expect-error: no se pueden mandar datos personales como propiedades extra
    registrarEvento("perfil_visto", { oficio: "gas", email: "ana@ejemplo.com" });
    // @ts-expect-error: oficio fuera del enum
    registrarEvento("perfil_visto", { oficio: "jardineria" });
    // @ts-expect-error: whatsapp_abierto solo desde perfil o postulación
    registrarEvento("whatsapp_abierto", { origen: "inicio" });
    // @ts-expect-error: el registro no se inicia como admin
    registrarEvento("registro_iniciado", { rol: "admin" });
    // @ts-expect-error: los eventos sin propiedades no aceptan propiedades
    registrarEvento("documentos_enviados", { cantidad: 3 });

    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
