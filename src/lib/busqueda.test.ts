import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { buscarProfesionales, ErrorBusqueda, leerParametrosBusqueda } from "./busqueda";
import type { Database } from "./supabase/tipos";

describe("leerParametrosBusqueda", () => {
  it("lee la URL completa del ejemplo", () => {
    const params = leerParametrosBusqueda(
      new URLSearchParams("oficio=gas&barrio=la-perla&matriculados=1&orden=calificacion&pagina=2"),
    );
    expect(params).toEqual({
      oficio: "gas",
      barrio: "la-perla",
      matriculados: true,
      orden: "calificacion",
      todaLaCiudad: false,
      pagina: 2,
    });
  });

  it("usa valores por defecto", () => {
    expect(leerParametrosBusqueda({ barrio: "centro" })).toEqual({
      oficio: undefined,
      barrio: "centro",
      matriculados: false,
      orden: "cercania",
      todaLaCiudad: false,
      pagina: 1,
    });
  });

  it("acepta el formato de searchParams de Next y toma el primer valor repetido", () => {
    const params = leerParametrosBusqueda({ barrio: ["centro", "otro"], oficio: "" });
    expect(params.barrio).toBe("centro");
    expect(params.oficio).toBeUndefined();
  });

  it("rechaza un oficio inexistente con un mensaje claro", () => {
    expect(() => leerParametrosBusqueda({ barrio: "centro", oficio: "albanileria" })).toThrow(
      "Ese oficio no existe.",
    );
  });

  it("pide el barrio", () => {
    let error: unknown;
    try {
      leerParametrosBusqueda({ oficio: "gas" });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorBusqueda);
    expect((error as ErrorBusqueda).campos.barrio).toBe("Elegí un barrio.");
  });

  it.each(["La Perla", "la_perla", "../x", "a'; drop table"])("rechaza el slug %j", (barrio) => {
    expect(() => leerParametrosBusqueda({ barrio })).toThrow(ErrorBusqueda);
  });

  it.each(["0", "-1", "1.5", "abc", "100000"])("rechaza la página %j", (pagina) => {
    expect(() => leerParametrosBusqueda({ barrio: "centro", pagina })).toThrow(
      "La página no es válida.",
    );
  });

  it("rechaza un orden o un filtro de matriculados desconocido", () => {
    expect(() => leerParametrosBusqueda({ barrio: "centro", orden: "precio" })).toThrow(
      "Ese orden no existe.",
    );
    expect(() => leerParametrosBusqueda({ barrio: "centro", matriculados: "si" })).toThrow(
      "El filtro de matriculados no es válido.",
    );
  });
});

function clienteFalso(opciones: {
  barrio: { id: number } | null;
  filas?: unknown[];
  errorRpc?: boolean;
}) {
  const rpc = vi.fn().mockResolvedValue({
    data: opciones.errorRpc ? null : (opciones.filas ?? []),
    error: opciones.errorRpc ? { message: "boom" } : null,
  });
  const maybeSingle = vi.fn().mockResolvedValue({ data: opciones.barrio, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { cliente: { from, rpc } as unknown as SupabaseClient<Database>, rpc, eq, from };
}

const fila = {
  usuario_id: "u1",
  nombre: "Pablo",
  apellido_inicial: "G",
  foto_path: null,
  oficios: ["gas"],
  anios_experiencia: 8,
  zonas_texto: "Toda la ciudad",
  promedio: "4.5",
  cantidad_resenas: 3,
  identidad_verificada: true,
  antecedentes_ok: true,
  matriculado: true,
  distancia_km: "1.2",
  total: 45,
};

describe("buscarProfesionales", () => {
  it("resuelve el barrio por slug, llama a la función y mapea el resultado", async () => {
    const { cliente, rpc, eq } = clienteFalso({ barrio: { id: 51 }, filas: [fila] });
    const pagina = await buscarProfesionales(
      cliente,
      new URLSearchParams("oficio=gas&barrio=la-perla&matriculados=1&orden=calificacion&pagina=2"),
    );

    expect(eq).toHaveBeenCalledWith("slug", "la-perla");
    expect(rpc).toHaveBeenCalledWith("buscar_profesionales", {
      p_oficio: "gas",
      p_barrio: 51,
      p_solo_matriculados: true,
      p_orden: "calificacion",
      p_toda_la_ciudad: false,
      p_limite: 20,
      p_desde: 20,
    });
    expect(pagina).toMatchObject({ total: 45, pagina: 2, paginas: 3 });
    expect(pagina.profesionales[0]).toMatchObject({
      usuarioId: "u1",
      apellidoInicial: "G",
      promedio: 4.5,
      distanciaKm: 1.2,
      zonasTexto: "Toda la ciudad",
    });
    expect(Object.keys(pagina.profesionales[0] ?? {})).not.toContain("whatsapp");
  });

  it("devuelve una página vacía sin resultados", async () => {
    const { cliente } = clienteFalso({ barrio: { id: 17 } });
    expect(await buscarProfesionales(cliente, { barrio: "centro" })).toEqual({
      profesionales: [],
      total: 0,
      pagina: 1,
      paginas: 1,
    });
  });

  it("falla con un mensaje claro si el barrio no existe", async () => {
    const { cliente, rpc } = clienteFalso({ barrio: null });
    await expect(buscarProfesionales(cliente, { barrio: "atlantida" })).rejects.toThrow(
      "Ese barrio no existe.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("no llama a la base si los parámetros son inválidos", async () => {
    const { cliente, from } = clienteFalso({ barrio: { id: 17 } });
    await expect(buscarProfesionales(cliente, { barrio: "centro", pagina: "0" })).rejects.toThrow(
      ErrorBusqueda,
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("no filtra el error de la base al usuario", async () => {
    const { cliente } = clienteFalso({ barrio: { id: 17 }, errorRpc: true });
    await expect(buscarProfesionales(cliente, { barrio: "centro" })).rejects.toThrow(
      "No pudimos buscar en este momento. Probá de nuevo.",
    );
  });
});
