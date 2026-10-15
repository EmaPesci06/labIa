import { describe, expect, it } from "vitest";

import { limpiarEvento, limpiarTexto, TEXTO_FILTRADO } from "./privacidad";
import { entornoSentry, opcionesSentry } from "./sentry";

describe("limpiarTexto", () => {
  it("reemplaza emails", () => {
    expect(limpiarTexto("escribime a ana.perez+obra@gmail.com hoy")).toBe(
      `escribime a ${TEXTO_FILTRADO} hoy`,
    );
  });

  it.each(["+5492235551234", "+54 9 223 555-1234", "0223 15 555 1234", "223-555-1234"])(
    "reemplaza el teléfono %s",
    (telefono) => {
      expect(limpiarTexto(`llamá al ${telefono}`)).toBe(`llamá al ${TEXTO_FILTRADO}`);
    },
  );

  it("reemplaza números de DNI sueltos en el texto", () => {
    expect(limpiarTexto("dni 30123456")).toBe(`dni ${TEXTO_FILTRADO}`);
  });

  it("deja los UUID, aunque terminen en muchos dígitos", () => {
    const ruta = "/profesionales/550e8400-e29b-41d4-a716-446655440000";
    expect(limpiarTexto(ruta)).toBe(ruta);
  });

  it("deja números cortos como códigos HTTP o cantidades", () => {
    expect(limpiarTexto("Falló con 500 después de 3 intentos")).toBe(
      "Falló con 500 después de 3 intentos",
    );
  });
});

describe("limpiarEvento (beforeSend)", () => {
  it("borra los campos dni, whatsapp y documento en cualquier nivel", () => {
    const evento = {
      extra: { dni: "30123456", Whatsapp: "+5492235551234", oficio: "gas" },
      contexts: { formulario: { documento: "frente.jpg", pasos: [{ DNI: "1" }] } },
    };

    expect(limpiarEvento(evento)).toEqual({
      extra: { oficio: "gas" },
      contexts: { formulario: { pasos: [{}] } },
    });
  });

  it.each([
    "apellido",
    "antecedentes",
    "matricula",
    "matricula_numero",
    "storage_path",
    "direccion",
    "nombre",
  ])("borra el campo %s en cualquier nivel, sin mirar mayúsculas", (campo) => {
    const evento = {
      extra: { [campo]: "dato personal", oficio: "gas" },
      contexts: { trabajo: { lista: [{ [campo.toUpperCase()]: "otro", id: "1" }] } },
    };

    expect(limpiarEvento(evento)).toEqual({
      extra: { oficio: "gas" },
      contexts: { trabajo: { lista: [{ id: "1" }] } },
    });
  });

  it("limpia emails y teléfonos del mensaje, la excepción, el request y las migas", () => {
    const evento = {
      message: "Falló el registro de ana@ejemplo.com",
      exception: {
        values: [{ type: "Error", value: "Teléfono inválido: 223 555 1234" }],
      },
      request: {
        url: "https://labia.app/buscar?tel=2235551234",
        cookies: { sesion: "secreta" },
        headers: { Cookie: "sb=secreta", "User-Agent": "Mozilla" },
      },
      breadcrumbs: [{ message: "click en +5492235551234", category: "ui.click" }],
    };

    expect(limpiarEvento(evento)).toEqual({
      message: `Falló el registro de ${TEXTO_FILTRADO}`,
      exception: { values: [{ type: "Error", value: `Teléfono inválido: ${TEXTO_FILTRADO}` }] },
      request: {
        url: `https://labia.app/buscar?tel=${TEXTO_FILTRADO}`,
        headers: { "User-Agent": "Mozilla" },
      },
      breadcrumbs: [{ message: `click en ${TEXTO_FILTRADO}`, category: "ui.click" }],
    });
  });

  it("deja del usuario solo el id", () => {
    const evento = {
      user: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "ana@ejemplo.com",
        username: "Ana",
        ip_address: "1.2.3.4",
      },
    };

    expect(limpiarEvento(evento).user).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
  });

  it("no toca el stacktrace ni los ids técnicos", () => {
    const frames = [{ filename: "app:///_next/static/chunks/12345678901-abc.js", lineno: 1 }];
    const evento = {
      event_id: "12345678901234567890123456789012",
      exception: { values: [{ value: "x", stacktrace: { frames } }] },
    };

    const limpio = limpiarEvento(evento);
    expect(limpio.event_id).toBe("12345678901234567890123456789012");
    expect(limpio.exception.values[0]?.stacktrace.frames).toEqual([
      { filename: "app:///_next/static/chunks/12345678901-abc.js", lineno: 1 },
    ]);
  });

  it("limpia los atributos de los spans (beforeSendSpan)", () => {
    const span = {
      span_id: "a680fea5131640af",
      trace_id: "b10ee524534f4c978e43bbbd23ac597a",
      attributes: {
        "url.full": { value: "https://labia.app/buscar?tel=2235551234", type: "string" },
      },
    };

    expect(limpiarEvento(span)).toEqual({
      span_id: "a680fea5131640af",
      trace_id: "b10ee524534f4c978e43bbbd23ac597a",
      attributes: {
        "url.full": { value: `https://labia.app/buscar?tel=${TEXTO_FILTRADO}`, type: "string" },
      },
    });
  });

  it("aguanta referencias circulares", () => {
    const extra: Record<string, unknown> = { nota: "ana@ejemplo.com" };
    extra.yoMismo = extra;

    const limpio = limpiarEvento({ extra });
    expect(limpio.extra.nota).toBe(TEXTO_FILTRADO);
  });
});

describe("opcionesSentry", () => {
  it("sin DSN no hay configuración (Sentry no se inicializa)", () => {
    expect(opcionesSentry(undefined, "production")).toBeNull();
    expect(opcionesSentry("", "production")).toBeNull();
  });

  it("en producción muestrea el 10 % de las trazas y nunca manda PII por defecto", () => {
    const opciones = opcionesSentry("https://clave@o1.ingest.sentry.io/1", "production");
    expect(opciones).toMatchObject({
      environment: "production",
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  });

  it("toma el entorno de VERCEL_ENV y fuera de Vercel es development", () => {
    expect(entornoSentry("preview")).toBe("preview");
    expect(entornoSentry("production")).toBe("production");
    expect(entornoSentry("development")).toBe("development");
    expect(entornoSentry(undefined)).toBe("development");
  });
});
