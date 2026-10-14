import { describe, expect, it } from "vitest";

import type { ItemVerificacion } from "@/lib/registro/tipos";

import {
  esPestana,
  esperaLarga,
  formatoVisible,
  mimeDeRuta,
  MOTIVO_REEMPLAZO,
  pendienteDesde,
  pestanaDe,
  resumenBannerVerificacion,
  type DocumentoAdmin,
} from "./logica";

const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1,
]);
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const PDF = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0, 0,
]);
const TEXTO = new Uint8Array([
  0x68, 0x6f, 0x6c, 0x61, 0x20, 0x6d, 0x75, 0x6e, 0x64, 0x6f, 0x21, 0x21, 0, 0, 0, 0,
]);

const RUTA = "7d3c1f2a-9b8e-4c6d-8a1f-2e3d4c5b6a79/dni_frente-1791734400000";

function doc(parcial: Partial<DocumentoAdmin> & Pick<DocumentoAdmin, "estado">): DocumentoAdmin {
  return {
    id: "v1",
    tipo: "dni_frente",
    motivoRechazo: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    revisadoAt: null,
    archivoBorrado: false,
    ...parcial,
  };
}

describe("pestanaDe", () => {
  it("un pendiente manda al profesional a Pendientes, aunque tenga rechazos", () => {
    expect(pestanaDe([doc({ estado: "rechazado" }), doc({ estado: "pendiente" })])).toBe(
      "pendientes",
    );
  });

  it("sin pendientes, un rechazo lo deja en Rechazados", () => {
    expect(pestanaDe([doc({ estado: "aprobado" }), doc({ estado: "rechazado" })])).toBe(
      "rechazados",
    );
  });

  it("todo aprobado va a Aprobados y sin documentos no aparece", () => {
    expect(pestanaDe([doc({ estado: "aprobado" })])).toBe("aprobados");
    expect(pestanaDe([])).toBeNull();
  });
});

describe("pendienteDesde y esperaLarga", () => {
  it("toma el documento pendiente más viejo", () => {
    const desde = pendienteDesde([
      doc({ estado: "pendiente", createdAt: "2026-10-05T10:00:00.000Z" }),
      doc({ estado: "pendiente", createdAt: "2026-10-02T10:00:00.000Z" }),
      doc({ estado: "aprobado", createdAt: "2026-09-01T10:00:00.000Z" }),
    ]);
    expect(desde).toBe("2026-10-02T10:00:00.000Z");
  });

  it("marca en rojo después de 48 horas de espera", () => {
    const ahora = new Date("2026-10-14T12:00:00.000Z");
    expect(esperaLarga("2026-10-12T11:59:00.000Z", ahora)).toBe(true);
    expect(esperaLarga("2026-10-12T12:01:00.000Z", ahora)).toBe(false);
  });
});

describe("esPestana", () => {
  it("solo acepta las tres pestañas", () => {
    expect(esPestana("pendientes")).toBe(true);
    expect(esPestana("rechazados")).toBe(true);
    expect(esPestana("aprobados")).toBe(true);
    expect(esPestana("otra")).toBe(false);
    expect(esPestana(undefined)).toBe(false);
  });
});

describe("mimeDeRuta y formatoVisible (magic bytes)", () => {
  it("mapea la extensión declarada a un MIME", () => {
    expect(mimeDeRuta(`${RUTA}.jpg`)).toBe("image/jpeg");
    expect(mimeDeRuta(`${RUTA}.jpeg`)).toBe("image/jpeg");
    expect(mimeDeRuta(`${RUTA}.png`)).toBe("image/png");
    expect(mimeDeRuta(`${RUTA}.pdf`)).toBe("application/pdf");
    expect(mimeDeRuta(`${RUTA}.webp`)).toBeNull();
  });

  it("muestra JPEG, PNG y PDF cuando el contenido coincide con la extensión", () => {
    expect(formatoVisible(JPEG, `${RUTA}.jpg`)).toBe("imagen");
    expect(formatoVisible(PNG, `${RUTA}.png`)).toBe("imagen");
    expect(formatoVisible(PDF, `${RUTA}.pdf`)).toBe("pdf");
  });

  it("no muestra un archivo cuyo contenido no es imagen ni PDF", () => {
    expect(formatoVisible(TEXTO, `${RUTA}.jpg`)).toBeNull();
    expect(formatoVisible(TEXTO, `${RUTA}.pdf`)).toBeNull();
  });

  it("no muestra un PDF disfrazado de imagen (la extensión no coincide con el contenido)", () => {
    expect(formatoVisible(PDF, `${RUTA}.jpg`)).toBeNull();
    expect(formatoVisible(JPEG, `${RUTA}.pdf`)).toBeNull();
    expect(formatoVisible(JPEG, `${RUTA}.png`)).toBeNull();
  });
});

describe("resumenBannerVerificacion", () => {
  const item = (
    parcial: Partial<ItemVerificacion> & Pick<ItemVerificacion, "tipo" | "estado">,
  ): ItemVerificacion => ({
    id: crypto.randomUUID(),
    motivoRechazo: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    ...parcial,
  });

  it("sin documentos no hay banner", () => {
    expect(resumenBannerVerificacion([])).toBeNull();
  });

  it("con algo pendiente, en revisión", () => {
    expect(
      resumenBannerVerificacion([
        item({ tipo: "dni_frente", estado: "pendiente" }),
        item({ tipo: "antecedentes", estado: "aprobado" }),
      ]),
    ).toEqual({ tipo: "en_revision" });
  });

  it("con un rechazo vigente muestra el documento y el motivo", () => {
    expect(
      resumenBannerVerificacion([
        item({ tipo: "antecedentes", estado: "rechazado", motivoRechazo: "Foto borrosa" }),
      ]),
    ).toEqual({
      tipo: "rechazado",
      documento: "Certificado de antecedentes",
      motivo: "Foto borrosa",
    });
  });

  it("un reemplazo automático no cuenta como rechazo", () => {
    expect(
      resumenBannerVerificacion([
        item({ tipo: "dni_frente", estado: "rechazado", motivoRechazo: MOTIVO_REEMPLAZO }),
      ]),
    ).toBeNull();
  });

  it("si el último de un tipo está aprobado, el rechazo viejo de ese tipo ya no se muestra", () => {
    const items = [
      item({ tipo: "dni_frente", estado: "aprobado", createdAt: "2026-10-05T10:00:00.000Z" }),
      item({
        tipo: "dni_frente",
        estado: "rechazado",
        motivoRechazo: "Foto borrosa",
        createdAt: "2026-10-01T10:00:00.000Z",
      }),
    ];
    expect(resumenBannerVerificacion(items)).toBeNull();
  });
});
