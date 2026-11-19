import { describe, expect, it } from "vitest";

import { faltaAprobarDocumentos, faltantesRegistrados, tiposVigentes } from "./documentos-estado";
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

describe("faltaAprobarDocumentos", () => {
  const aprobados = [
    v("dni_frente", "aprobado"),
    v("dni_dorso", "aprobado"),
    v("antecedentes", "aprobado"),
  ];

  it("sin documentos todavía falta aprobar", () => {
    expect(faltaAprobarDocumentos([], false)).toBe(true);
  });

  it("con todos los obligatorios aprobados no falta nada", () => {
    expect(faltaAprobarDocumentos(aprobados, false)).toBe(false);
  });

  it("uno pendiente o rechazado sigue faltando", () => {
    const base = aprobados.slice(0, 2);
    expect(faltaAprobarDocumentos([...base, v("antecedentes", "pendiente")], false)).toBe(true);
    expect(faltaAprobarDocumentos([...base, v("antecedentes", "rechazado")], false)).toBe(true);
  });

  it("para gasistas también hace falta la matrícula aprobada", () => {
    expect(faltaAprobarDocumentos(aprobados, true)).toBe(true);
    expect(faltaAprobarDocumentos([...aprobados, v("matricula", "aprobado")], true)).toBe(false);
  });

  it("manda el más nuevo de cada tipo", () => {
    const lista = [
      v("antecedentes", "rechazado", "2026-10-13T00:00:00Z"),
      v("antecedentes", "aprobado", "2026-10-12T00:00:00Z"),
      v("dni_frente", "aprobado"),
      v("dni_dorso", "aprobado"),
    ];
    expect(faltaAprobarDocumentos(lista, false)).toBe(true);
  });
});
