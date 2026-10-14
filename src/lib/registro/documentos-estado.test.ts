import { describe, expect, it } from "vitest";

import { faltantesRegistrados, tiposVigentes } from "./documentos-estado";
import type { ItemVerificacion } from "./tipos";

const v = (
  tipo: ItemVerificacion["tipo"],
  estado: ItemVerificacion["estado"],
  createdAt = "2026-10-12T00:00:00Z",
): ItemVerificacion => ({
  id: `${tipo}-${createdAt}`,
  tipo,
  estado,
  motivoRechazo: null,
  createdAt,
});

describe("documentos vigentes", () => {
  it("cuenta el más nuevo de cada tipo si no está rechazado", () => {
    const lista = [
      v("dni_frente", "pendiente", "2026-10-13T00:00:00Z"),
      v("dni_frente", "rechazado", "2026-10-12T00:00:00Z"),
      v("dni_dorso", "rechazado"),
    ];
    expect([...tiposVigentes(lista)]).toEqual(["dni_frente"]);
  });

  it("faltan DNI y antecedentes si no hay nada", () => {
    expect(faltantesRegistrados([], false)).toEqual(["dni_frente", "dni_dorso", "antecedentes"]);
  });

  it("un gasista también necesita la matrícula", () => {
    const completo = [
      v("dni_frente", "pendiente"),
      v("dni_dorso", "aprobado"),
      v("antecedentes", "pendiente"),
    ];
    expect(faltantesRegistrados(completo, false)).toEqual([]);
    expect(faltantesRegistrados(completo, true)).toEqual(["matricula"]);
  });
});
