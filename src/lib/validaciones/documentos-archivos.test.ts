import { describe, expect, it } from "vitest";

import {
  documentosFaltantes,
  errorDeArchivoDocumento,
  MAX_BYTES_DOCUMENTO,
  mensajeDocumentosFaltantes,
  tipoPorCabecera,
} from "./documentos";

const archivo = (name: string, type: string, size = 100) => ({ name, type, size });

describe("archivos de documentos", () => {
  it("exige que extensión y tipo MIME coincidan", () => {
    expect(errorDeArchivoDocumento(archivo("a.pdf", "application/pdf"))).toBeNull();
    expect(errorDeArchivoDocumento(archivo("a.JPG", "image/jpeg"))).toBeNull();
    expect(errorDeArchivoDocumento(archivo("a.webp", "image/webp"))).toBeNull();
    expect(errorDeArchivoDocumento(archivo("a.pdf", "image/png"))).toMatch(/Formato no válido/);
    expect(errorDeArchivoDocumento(archivo("a.txt", "application/pdf"))).toMatch(/Formato/);
    expect(errorDeArchivoDocumento(archivo("a.pdf", ""))).toMatch(/Formato/);
    expect(errorDeArchivoDocumento(archivo("sin-extension", "image/png"))).toMatch(/Formato/);
  });

  it("rechaza lo que pesa más de 8 MB", () => {
    expect(
      errorDeArchivoDocumento(archivo("a.pdf", "application/pdf", MAX_BYTES_DOCUMENTO + 1)),
    ).toBe("El archivo no puede superar los 8 MB.");
  });

  it("reconoce el tipo real por los primeros bytes", () => {
    const relleno = (...b: number[]) => Uint8Array.from([...b, ...new Array(12).fill(0)]);
    expect(tipoPorCabecera(relleno(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(tipoPorCabecera(relleno(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(tipoPorCabecera(relleno(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("application/pdf");
    expect(
      tipoPorCabecera(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
    expect(tipoPorCabecera(new TextEncoder().encode("hola mundo!!"))).toBeNull();
  });

  it("calcula los documentos obligatorios que faltan", () => {
    expect(documentosFaltantes(false, [])).toEqual(["dni_frente", "dni_dorso", "antecedentes"]);
    expect(documentosFaltantes(false, ["dni_frente", "dni_dorso", "antecedentes"])).toEqual([]);
    expect(documentosFaltantes(true, ["dni_frente", "dni_dorso", "antecedentes"])).toEqual([
      "matricula",
    ]);
  });

  it("avisa con el mensaje de la tarea", () => {
    expect(mensajeDocumentosFaltantes(false)).toBe(
      "Para publicar tu perfil necesitamos tu DNI y tu certificado de antecedentes.",
    );
    expect(mensajeDocumentosFaltantes(true)).toContain("matrícula");
  });
});
