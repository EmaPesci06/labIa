import "server-only";

import { cache } from "react";

import type { Oficio } from "@/lib/busqueda";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import type { UrgenciaTrabajo } from "@/lib/validaciones/trabajo";

import { type EstadoPostulacion, distanciaEntreBarrios } from "./consulta-comun";

export type TrabajoParaMi = {
  id: string;
  oficio: Oficio;
  titulo: string;
  descripcion: string;
  urgencia: UrgenciaTrabajo;
  presupuestoEstimado: number | null;
  fotos: string[];
  barrioId: number;
  barrioNombre: string;
  distanciaKm: number | null;
  cantidadPostulaciones: number;
  yaMePostule: boolean;
  createdAt: string;
  clienteNombre: string | null;
  clienteApellidoInicial: string | null;
};

export type FiltrosTrabajos = {
  oficio?: Oficio | null;
  soloMisZonas?: boolean;
  limite?: number;
  desde?: number;
};

/**
 * Consulta los trabajos abiertos relevantes para el profesional según sus oficios y zonas.
 * `total` es la cantidad completa que cumple los filtros, aunque se pida solo una parte.
 */
export async function obtenerTrabajosParaMi(
  filtros: FiltrosTrabajos = {},
): Promise<{ trabajos: TrabajoParaMi[]; total: number }> {
  if (!supabaseConfigurado()) return { trabajos: [], total: 0 };
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc("trabajos_para_mi", {
    p_oficio: filtros.oficio ?? undefined,
    p_solo_mis_zonas: filtros.soloMisZonas ?? true,
    p_limite: filtros.limite ?? 50,
    p_desde: filtros.desde ?? 0,
  });

  if (error || !data) return { trabajos: [], total: 0 };

  const total = Number(data[0]?.total ?? data.length);
  const trabajos: TrabajoParaMi[] = data.map((fila) => ({
    id: fila.id,
    oficio: fila.oficio as Oficio,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    urgencia: fila.urgencia as UrgenciaTrabajo,
    presupuestoEstimado: fila.presupuesto_estimado,
    fotos: fila.fotos ?? [],
    barrioId: fila.barrio_id,
    barrioNombre: fila.barrio_nombre,
    distanciaKm: fila.distancia_km !== null ? Number(fila.distancia_km) : null,
    cantidadPostulaciones: fila.cantidad_postulaciones,
    yaMePostule: fila.ya_me_postule,
    createdAt: fila.created_at,
    clienteNombre: fila.cliente_nombre,
    clienteApellidoInicial: fila.cliente_apellido_inicial,
  }));

  return { trabajos, total };
}

export type PostulacionItem = {
  id: string;
  trabajoId: string;
  mensaje: string;
  precioEstimado: number | null;
  senaPropuesta: number | null;
  estado: EstadoPostulacion;
  createdAt: string;
  trabajo: {
    id: string;
    titulo: string;
    descripcion: string;
    oficio: Oficio;
    urgencia: UrgenciaTrabajo;
    barrioNombre: string;
    estado: string;
  } | null;
  cliente: {
    nombre: string | null;
    apellidoInicial: string | null;
  } | null;
};

/** Consulta las postulaciones realizadas por el profesional autenticado. */
export async function obtenerMisPostulaciones(): Promise<PostulacionItem[]> {
  if (!supabaseConfigurado()) return [];
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase
    .from("postulaciones")
    .select(
      `
      id,
      trabajo_id,
      mensaje,
      precio_estimado,
      sena_propuesta,
      estado,
      created_at,
      trabajos (
        id,
        titulo,
        descripcion,
        oficio,
        urgencia,
        barrio_id,
        estado,
        cliente_id,
        barrios (nombre)
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  // Clientes públicos de los trabajos postulados
  const clienteIds = Array.from(
    new Set(
      data
        .map((p) => (p.trabajos as { cliente_id?: string } | null)?.cliente_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const clientesMap = new Map<string, { nombre: string | null; apellidoInicial: string | null }>();
  if (clienteIds.length > 0) {
    const { data: usuarios } = await supabase
      .from("usuarios_publicos")
      .select("id, nombre, apellido_inicial")
      .in("id", clienteIds);

    if (usuarios) {
      for (const u of usuarios) {
        if (u.id) {
          clientesMap.set(u.id, {
            nombre: u.nombre,
            apellidoInicial: u.apellido_inicial,
          });
        }
      }
    }
  }

  return data.map((fila) => {
    const t = fila.trabajos as {
      id: string;
      titulo: string;
      descripcion: string;
      oficio: string;
      urgencia: string;
      estado: string;
      cliente_id?: string;
      barrios?: { nombre: string } | null;
    } | null;

    const clienteInfo = t?.cliente_id ? (clientesMap.get(t.cliente_id) ?? null) : null;

    return {
      id: fila.id,
      trabajoId: fila.trabajo_id,
      mensaje: fila.mensaje,
      precioEstimado: fila.precio_estimado,
      senaPropuesta: fila.sena_propuesta,
      estado: fila.estado as EstadoPostulacion,
      createdAt: fila.created_at,
      trabajo: t
        ? {
            id: t.id,
            titulo: t.titulo,
            descripcion: t.descripcion,
            oficio: t.oficio as Oficio,
            urgencia: t.urgencia as UrgenciaTrabajo,
            barrioNombre: t.barrios?.nombre ?? "Mar del Plata",
            estado: t.estado,
          }
        : null,
      cliente: clienteInfo,
    };
  });
}

export type PerfilParaTrabajos = {
  oficios: Oficio[];
  zonas: number[];
  zonasNombres: string[];
  todaLaCiudad: boolean;
  publicado: boolean;
};

/**
 * Carga oficios y nombres de zonas del profesional para los filtros y el encabezado de /trabajos.
 * Memorizada por pedido: la leen la lista y el detalle (metadatos y página).
 */
export const obtenerPerfilParaTrabajos = cache(
  async (usuarioId: string): Promise<PerfilParaTrabajos | null> => {
    if (!supabaseConfigurado()) return null;
    const supabase = await crearClienteServidor();

    const { data: perfil } = await supabase
      .from("perfiles_profesionales")
      .select("oficios, zonas, toda_la_ciudad, publicado")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (!perfil) return null;

    const oficios = (perfil.oficios ?? []) as Oficio[];
    const zonas = perfil.zonas ?? [];
    const todaLaCiudad = perfil.toda_la_ciudad ?? false;
    const publicado = perfil.publicado ?? false;

    let zonasNombres: string[] = [];
    if (!todaLaCiudad && zonas.length > 0) {
      const { data: barrios } = await supabase.from("barrios").select("id, nombre").in("id", zonas);
      if (barrios) {
        // Mantener el orden original de las zonas
        const mapa = new Map(barrios.map((b) => [b.id, b.nombre]));
        zonasNombres = zonas.map((id) => mapa.get(id)).filter((n): n is string => Boolean(n));
      }
    }

    return { oficios, zonas, zonasNombres, todaLaCiudad, publicado };
  },
);

export type TrabajoDetalle = {
  id: string;
  oficio: Oficio;
  titulo: string;
  descripcion: string;
  urgencia: UrgenciaTrabajo;
  presupuestoEstimado: number | null;
  fotos: string[];
  barrioId: number;
  barrioNombre: string;
  distanciaKm: number | null;
  estado: string;
  createdAt: string;
  cliente: {
    nombre: string | null;
    apellidoInicial: string | null;
  };
  miPostulacion: {
    id: string;
    mensaje: string;
    precioEstimado: number | null;
    senaPropuesta: number | null;
    estado: EstadoPostulacion;
    createdAt: string;
  } | null;
};

/**
 * Consulta el detalle de un trabajo para la pantalla /trabajos/[id].
 * - Para profesionales publicados o que ya postularon: consulta directa sobre `trabajos`.
 * - Para profesionales en revisión: fallback a `trabajos_para_mi` para ver trabajos abiertos.
 *
 * Memorizada por pedido: `generateMetadata` y la página piden lo mismo y cuestan una sola vez.
 */
export const obtenerTrabajoDetalle = cache(
  async (
    trabajoId: string,
    profesionalId: string,
  ): Promise<{
    trabajo: TrabajoDetalle | null;
    perfil: PerfilParaTrabajos | null;
  }> => {
    if (!supabaseConfigurado()) return { trabajo: null, perfil: null };
    const supabase = await crearClienteServidor();

    const perfil = await obtenerPerfilParaTrabajos(profesionalId);

    // 1. Postulación del profesional si ya existe
    const { data: miPost } = await supabase
      .from("postulaciones")
      .select("id, mensaje, precio_estimado, sena_propuesta, estado, created_at")
      .eq("trabajo_id", trabajoId)
      .eq("profesional_id", profesionalId)
      .neq("estado", "retirada")
      .maybeSingle();

    // 2. Consulta del trabajo directo por RLS (funciona si está publicado o si ya se postuló)
    const { data: fila } = await supabase
      .from("trabajos")
      .select(
        `
      id,
      oficio,
      titulo,
      descripcion,
      urgencia,
      presupuesto_estimado,
      fotos,
      barrio_id,
      estado,
      created_at,
      cliente_id,
      barrios (nombre)
    `,
      )
      .eq("id", trabajoId)
      .maybeSingle();

    if (fila) {
      let clienteNombre: string | null = null;
      let clienteApellidoInicial: string | null = null;
      if (fila.cliente_id) {
        const { data: cli } = await supabase
          .from("usuarios_publicos")
          .select("nombre, apellido_inicial")
          .eq("id", fila.cliente_id)
          .maybeSingle();
        if (cli) {
          clienteNombre = cli.nombre;
          clienteApellidoInicial = cli.apellido_inicial;
        }
      }

      let distanciaKm: number | null = null;
      const { data: usr } = await supabase
        .from("usuarios")
        .select("barrio_id")
        .eq("id", profesionalId)
        .maybeSingle();

      if (usr?.barrio_id && fila.barrio_id) {
        distanciaKm = await distanciaEntreBarrios(supabase, usr.barrio_id, fila.barrio_id);
      }

      const barriosObj = fila.barrios as { nombre?: string } | null;
      const barrioNombre = barriosObj?.nombre ?? "Mar del Plata";

      return {
        trabajo: {
          id: fila.id,
          oficio: fila.oficio as Oficio,
          titulo: fila.titulo,
          descripcion: fila.descripcion,
          urgencia: fila.urgencia as UrgenciaTrabajo,
          presupuestoEstimado: fila.presupuesto_estimado,
          fotos: fila.fotos ?? [],
          barrioId: fila.barrio_id,
          barrioNombre,
          distanciaKm,
          estado: fila.estado,
          createdAt: fila.created_at,
          cliente: {
            nombre: clienteNombre,
            apellidoInicial: clienteApellidoInicial,
          },
          miPostulacion: miPost
            ? {
                id: miPost.id,
                mensaje: miPost.mensaje,
                precioEstimado: miPost.precio_estimado,
                senaPropuesta: miPost.sena_propuesta,
                estado: miPost.estado as EstadoPostulacion,
                createdAt: miPost.created_at,
              }
            : null,
        },
        perfil,
      };
    }

    // 3. Si fila es null (profesional en revisión), buscar en trabajos_para_mi
    const { trabajos } = await obtenerTrabajosParaMi({ soloMisZonas: false, limite: 100 });
    const t = trabajos.find((item) => item.id === trabajoId);
    if (t) {
      return {
        trabajo: {
          id: t.id,
          oficio: t.oficio,
          titulo: t.titulo,
          descripcion: t.descripcion,
          urgencia: t.urgencia,
          presupuestoEstimado: t.presupuestoEstimado,
          fotos: t.fotos,
          barrioId: t.barrioId,
          barrioNombre: t.barrioNombre,
          distanciaKm: t.distanciaKm,
          estado: "abierto",
          createdAt: t.createdAt,
          cliente: {
            nombre: t.clienteNombre,
            apellidoInicial: t.clienteApellidoInicial,
          },
          miPostulacion: null,
        },
        perfil,
      };
    }

    return { trabajo: null, perfil };
  },
);
