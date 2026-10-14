import { describe, expect, it } from "vitest";

import {
  esquemaDocumento,
  esRutaDocumento,
  generarRutaDocumento,
  MAX_BYTES_DOCUMENTO,
  MIMES_DOCUMENTO_ACEPTADOS,
} from "./documentos";

describe("validaciones de documentos", () => {
  const uid = "11111111-1111-4111-a111-111111111111";

  it("define el tamaño máximo en 8 MB y los tipos MIME correctos", () => {
    expect(MAX_BYTES_DOCUMENTO).toBe(8 * 1024 * 1024);
    expect(MIMES_DOCUMENTO_ACEPTADOS).toContain("application/pdf");
    expect(MIMES_DOCUMENTO_ACEPTADOS).toContain("image/jpeg");
    expect(MIMES_DOCUMENTO_ACEPTADOS).toContain("image/png");
  });

  it("valida rutas válidas en el bucket documentos", () => {
    const rutaDni = `${uid}/dni_frente-1791734400000.jpg`;
    expect(esRutaDocumento(rutaDni, uid)).toBe(true);
    expect(esRutaDocumento(rutaDni, uid, "dni_frente")).toBe(true);
    expect(esRutaDocumento(rutaDni, uid, "dni_dorso")).toBe(false);

    const rutaPdf = `${uid}/antecedentes-1791734400001.pdf`;
    expect(esRutaDocumento(rutaPdf, uid, "antecedentes")).toBe(true);
  });

  it("rechaza rutas malformadas o de otro usuario", () => {
    const otroUid = "22222222-2222-4222-a222-222222222222";
    expect(esRutaDocumento(`${otroUid}/dni_frente-123.jpg`, uid)).toBe(false);
    expect(esRutaDocumento(`${uid}/invalido-123.jpg`, uid)).toBe(false);
    expect(esRutaDocumento(`${uid}/../ataque.jpg`, uid)).toBe(false);
    expect(esRutaDocumento(`${uid}/dni_frente-123.gif`, uid)).toBe(false);
  });

  it("genera rutas con formato timestamp y extensión normalizada", () => {
    const ruta = generarRutaDocumento(uid, "dni_dorso", "png");
    expect(ruta).toMatch(new RegExp(`^${uid}/dni_dorso-\\d+\\.png$`));

    const rutaJpeg = generarRutaDocumento(uid, "matricula", "jpeg");
    expect(rutaJpeg).toMatch(new RegExp(`^${uid}/matricula-\\d+\\.jpg$`));
  });

  it("esquemaDocumento valida tipo y storagePath", () => {
    const valido = esquemaDocumento.safeParse({
      tipo: "dni_frente",
      storagePath: `${uid}/dni_frente-123.jpg`,
    });
    expect(valido.success).toBe(true);

    const invalido = esquemaDocumento.safeParse({
      tipo: "otro_tipo",
      storagePath: "algo",
    });
    expect(invalido.success).toBe(false);
  });
});
