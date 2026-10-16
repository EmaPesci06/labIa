import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/tipos";

import { obtenerResenas } from "./cargar";

const PROFESIONAL = "11111111-1111-4111-8111-111111111111";
const AHORA = new Date("2026-10-15T12:00:00Z");

type FilaResena = {
  id: string | null;
  puntaje: number | null;
  texto: string | null;
  created_at: string | null;
  autor_nombre: string | null;
  autor_inicial: string | null;
};

/** Cliente falso: registra la tabla y las columnas pedidas y devuelve `filas` al cerrar la consulta. */
function clienteFalso(filas: FilaResena[]) {
  const tablas: string[] = [];
  const columnas: string[] = [];
  const consulta = {
    select: (cols: string) => {
      columnas.push(cols);
      return consulta;
    },
    eq: () => consulta,
    order: () => consulta,
    range: async () => ({ data: filas, count: filas.length, error: null }),
  };
  const cliente = {
    from: (tabla: string) => {
      tablas.push(tabla);
      return consulta;
    },
  };
  return {
    cliente: cliente as unknown as SupabaseClient<Database>,
    tablas,
    columnas,
  };
}

describe("obtenerResenas (LAB-56)", () => {
  it("lee de la vista resenas_publicas y nunca pide autor_id ni trabajo_id", async () => {
    const falso = clienteFalso([]);

    await obtenerResenas(falso.cliente, PROFESIONAL, 0, 5, AHORA);

    expect(falso.tablas).toEqual(["resenas_publicas"]);
    expect(falso.columnas[0]).not.toMatch(/autor_id|trabajo_id/);
    expect(falso.columnas[0]).toContain("autor_nombre");
    expect(falso.columnas[0]).toContain("autor_inicial");
  });

  it("arma el autor con nombre e inicial del apellido", async () => {
    const falso = clienteFalso([
      {
        id: "22222222-2222-4222-8222-222222222222",
        puntaje: 5,
        texto: "Muy prolijo",
        created_at: "2026-10-14T12:00:00Z",
        autor_nombre: "Carla",
        autor_inicial: "U",
      },
    ]);

    const pagina = await obtenerResenas(falso.cliente, PROFESIONAL, 0, 5, AHORA);

    expect(pagina.total).toBe(1);
    expect(pagina.resenas[0]).toMatchObject({
      id: "22222222-2222-4222-8222-222222222222",
      autor: "Carla U.",
      puntaje: 5,
      texto: "Muy prolijo",
    });
  });

  it("muestra 'Cliente de LabÍA' cuando el autor no tiene nombre público (cuenta borrada)", async () => {
    const falso = clienteFalso([
      {
        id: "33333333-3333-4333-8333-333333333333",
        puntaje: 4,
        texto: null,
        created_at: "2026-10-13T12:00:00Z",
        autor_nombre: null,
        autor_inicial: null,
      },
    ]);

    const pagina = await obtenerResenas(falso.cliente, PROFESIONAL, 0, 5, AHORA);

    expect(pagina.resenas[0]?.autor).toBe("Cliente de LabÍA");
  });

  it("no consulta nada si el id del profesional no es un uuid", async () => {
    const falso = clienteFalso([]);

    const pagina = await obtenerResenas(falso.cliente, "no-es-uuid", 0, 5, AHORA);

    expect(pagina).toEqual({ resenas: [], total: 0 });
    expect(falso.tablas).toEqual([]);
  });
});
