import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/sesion-falsa", () => ({ rolFalso: () => null }));

// Cliente de Supabase falso: cada tabla devuelve sus filas y `distancia_km` cuenta sus llamadas.
const { tablas, rpc, cliente } = vi.hoisted(() => {
  const tablas: Record<string, unknown> = {};
  const rpc = vi.fn(async (_nombre: string, args: { barrio_a: number; barrio_b: number }) => ({
    data: args.barrio_b * 1.5,
    error: null,
  }));

  function consulta(datos: unknown) {
    const b = {
      select: () => b,
      eq: () => b,
      neq: () => b,
      in: () => b,
      order: () => b,
      maybeSingle: async () => ({
        data: Array.isArray(datos) ? (datos[0] ?? null) : datos,
        error: null,
      }),
      // `count` lo usa `select(..., { count: "exact", head: true })`: cantidad de filas.
      then: (ok: (valor: unknown) => unknown, ko?: (error: unknown) => unknown) =>
        Promise.resolve({
          data: datos,
          error: null,
          count: Array.isArray(datos) ? datos.length : null,
        }).then(ok, ko),
    };
    return b;
  }

  const cliente = { from: (tabla: string) => consulta(tablas[tabla]), rpc };
  return { tablas, rpc, cliente };
});

vi.mock("@/lib/supabase/servidor", () => ({
  supabaseConfigurado: () => true,
  crearClienteServidor: async () => cliente,
}));

import { contarMisTrabajosCliente, obtenerDetalleMiTrabajoCliente } from "./consulta-cliente";

const TRABAJO_ID = "11111111-1111-4111-8111-111111111111";

function postulante(n: number) {
  return {
    id: `post-${n}`,
    profesional_id: `prof-${n}`,
    mensaje: `Hola ${n}`,
    precio_estimado: 10000,
    sena_propuesta: null,
    estado: "enviada",
    created_at: "2026-10-14T10:00:00Z",
  };
}

describe("obtenerDetalleMiTrabajoCliente: distancias sin N+1", () => {
  beforeEach(() => {
    rpc.mockClear();
    tablas.trabajos = {
      id: TRABAJO_ID,
      oficio: "gas",
      titulo: "Olor a gas",
      descripcion: "Desde ayer",
      urgencia: "esta_semana",
      presupuesto_estimado: null,
      fotos: [],
      barrio_id: 1,
      estado: "abierto",
      profesional_elegido_id: null,
      created_at: "2026-10-14T10:00:00Z",
      barrios: { nombre: "Centro" },
    };
    // Cinco postulantes en tres barrios distintos (el 1 es el del trabajo).
    tablas.postulaciones = [1, 2, 3, 4, 5].map(postulante);
    tablas.usuarios_publicos = [2, 2, 3, 3, 1].map((barrio, i) => ({
      id: `prof-${i + 1}`,
      nombre: `Profesional ${i + 1}`,
      apellido_inicial: "G",
      foto_path: null,
      barrio_id: barrio,
    }));
    tablas.perfiles_profesionales = [];
  });

  it("pide la distancia una vez por barrio distinto, no por postulante", async () => {
    await obtenerDetalleMiTrabajoCliente(TRABAJO_ID, "cliente-1");

    // Cinco postulantes, pero los barrios distintos al del trabajo son 2 y 3.
    expect(rpc).toHaveBeenCalledTimes(2);
    const destinos = rpc.mock.calls.map(([, args]) => args.barrio_b).sort();
    expect(destinos).toEqual([2, 3]);
    for (const [nombre, args] of rpc.mock.calls) {
      expect(nombre).toBe("distancia_km");
      expect(args.barrio_a).toBe(1);
    }
  });

  it("reparte la distancia de cada barrio a sus postulantes y deja 0 para el mismo barrio", async () => {
    const detalle = await obtenerDetalleMiTrabajoCliente(TRABAJO_ID, "cliente-1");

    const distancias = detalle?.postulantes.map((p) => p.profesional.distanciaKm);
    expect(distancias).toEqual([3, 3, 4.5, 4.5, 0]);
  });
});

describe("contarMisTrabajosCliente: total sin filtro de pestaña (LAB-51)", () => {
  beforeEach(() => {
    delete tablas.trabajos;
  });

  it("cuenta todos los trabajos del cliente, sin importar su estado", async () => {
    tablas.trabajos = [{ id: "a" }, { id: "b" }, { id: "c" }];
    await expect(contarMisTrabajosCliente("cliente-1")).resolves.toBe(3);
  });

  it("devuelve 0 cuando el cliente no tiene trabajos", async () => {
    tablas.trabajos = [];
    await expect(contarMisTrabajosCliente("cliente-1")).resolves.toBe(0);
  });
});
