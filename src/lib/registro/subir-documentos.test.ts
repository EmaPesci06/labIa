import { beforeEach, describe, expect, it, vi } from "vitest";

const { darConsentimiento, upload } = vi.hoisted(() => ({
  darConsentimiento: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/lib/legales-acciones", () => ({ darConsentimientoDatosSensibles: darConsentimiento }));
vi.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ storage: { from: () => ({ upload }) } }),
}));
vi.mock("@/lib/registro/documentos", () => ({ registrarDocumentoAccion: vi.fn() }));
vi.mock("@/lib/imagen", () => ({ comprimirImagen: vi.fn() }));

import type { TipoDocumento } from "@/lib/validaciones/documentos";
import { MENSAJE_CONSENTIMIENTO } from "@/lib/validaciones/consentimiento";

import { subirDocumentos } from "./subir-documentos";

const entradas = (): [TipoDocumento, File][] => [
  ["antecedentes", new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" })],
];

describe("subirDocumentos: consentimiento (LAB-43)", () => {
  beforeEach(() => {
    darConsentimiento.mockReset();
    upload.mockReset();
    upload.mockResolvedValue({ error: { message: "sin red" } });
    darConsentimiento.mockResolvedValue({ exito: "Guardamos tu consentimiento." });
  });

  it("sin la casilla tildada no llama a la acción ni sube nada", async () => {
    const resultado = await subirDocumentos("u-1", entradas(), () => {}, false);

    expect(resultado).toEqual({ ok: false, subidos: [], mensaje: MENSAJE_CONSENTIMIENTO });
    expect(darConsentimiento).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("con la casilla tildada registra el consentimiento antes del primer archivo", async () => {
    await subirDocumentos("u-1", entradas(), () => {}, true);

    expect(darConsentimiento).toHaveBeenCalledTimes(1);
    const datos = darConsentimiento.mock.calls[0]?.[1] as FormData;
    expect(datos.get("consiento")).toBe("on");
    expect(upload).toHaveBeenCalled();
    expect(darConsentimiento.mock.invocationCallOrder[0]).toBeLessThan(
      upload.mock.invocationCallOrder[0] ?? Infinity,
    );
  });
});
