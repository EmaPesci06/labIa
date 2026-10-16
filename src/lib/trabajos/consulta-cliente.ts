import "server-only";

import type { Oficio } from "@/lib/busqueda";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import type { UrgenciaTrabajo } from "@/lib/validaciones/trabajo";

import { type EstadoPostulacion, conRolFalso, distanciasDesdeBarrio } from "./consulta-comun";
import { firmarFotosTrabajo } from "./fotos-firmadas";

export type TrabajoClienteItem = {
  id: string;
  oficio: Oficio;
  titulo: string;
  descripcion: string;
  urgencia: UrgenciaTrabajo;
  estado: "abierto" | "asignado" | "cerrado" | "cancelado";
  profesionalElegidoId: string | null;
  barrioNombre: string;
  cantidadPostulaciones: number;
  createdAt: string;
};

/**
 * Consulta los trabajos publicados por el cliente según el filtro de pestaña (LAB-29).
 */
export async function obtenerMisTrabajosCliente(
  clienteId: string,
  filtro: "abiertos" | "contratados" | "terminados" = "abiertos",
): Promise<TrabajoClienteItem[]> {
  return conRolFalso<TrabajoClienteItem[]>(
    () => [
      {
        id: "88888888-8888-4888-8888-888888888881",
        oficio: "gas",
        titulo: "Olor a gas en la cocina",
        descripcion: "Desde ayer hay olor cerca del horno.",
        urgencia: "esta_semana",
        estado:
          filtro === "abiertos" ? "abierto" : filtro === "contratados" ? "asignado" : "cerrado",
        profesionalElegidoId: null,
        barrioNombre: "La Perla",
        cantidadPostulaciones: 2,
        createdAt: new Date().toISOString(),
      },
    ],
    () => consultarMisTrabajos(clienteId, filtro),
  );
}

/**
 * Cuenta todos los trabajos del cliente, sin importar la pestaña (LAB-51). Sirve para elegir el
 * texto de una lista vacía: si no hay ninguno, "Todavía no publicaste trabajos."; si hay en otras
 * pestañas, un texto propio. Un error de la base cuenta como 0 (mismo texto que antes).
 */
export async function contarMisTrabajosCliente(clienteId: string): Promise<number> {
  return conRolFalso<number>(
    () => 1,
    () => contarTrabajosEnBase(clienteId),
  );
}

async function contarTrabajosEnBase(clienteId: string): Promise<number> {
  if (!supabaseConfigurado()) return 0;
  const supabase = await crearClienteServidor();

  const { count, error } = await supabase
    .from("trabajos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId);

  if (error) return 0;
  return count ?? 0;
}

async function consultarMisTrabajos(
  clienteId: string,
  filtro: "abiertos" | "contratados" | "terminados",
): Promise<TrabajoClienteItem[]> {
  if (!supabaseConfigurado()) return [];
  const supabase = await crearClienteServidor();

  let query = supabase
    .from("trabajos")
    .select(
      `
      id,
      oficio,
      titulo,
      descripcion,
      urgencia,
      estado,
      profesional_elegido_id,
      cantidad_postulaciones,
      created_at,
      barrios (nombre)
    `,
    )
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });

  if (filtro === "abiertos") {
    query = query.eq("estado", "abierto");
  } else if (filtro === "contratados") {
    query = query.eq("estado", "asignado");
  } else {
    query = query.in("estado", ["cerrado", "cancelado"]);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((fila) => {
    const barrioObj = fila.barrios as { nombre?: string } | null;
    return {
      id: fila.id,
      oficio: fila.oficio as Oficio,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      urgencia: fila.urgencia as UrgenciaTrabajo,
      estado: fila.estado as "abierto" | "asignado" | "cerrado" | "cancelado",
      profesionalElegidoId: fila.profesional_elegido_id,
      barrioNombre: barrioObj?.nombre ?? "Mar del Plata",
      cantidadPostulaciones: fila.cantidad_postulaciones ?? 0,
      createdAt: fila.created_at,
    };
  });
}

export type PostulanteParaCliente = {
  id: string;
  profesionalId: string;
  mensaje: string;
  precioEstimado: number | null;
  senaPropuesta: number | null;
  estado: EstadoPostulacion;
  createdAt: string;
  profesional: {
    nombre: string;
    apellidoInicial: string;
    fotoPath: string | null;
    especialidades: string | null;
    promedio: number;
    cantidadResenas: number;
    matriculado: boolean;
    oficios: Oficio[];
    distanciaKm: number | null;
  };
};

export type DetalleMiTrabajoCliente = {
  id: string;
  oficio: Oficio;
  titulo: string;
  descripcion: string;
  urgencia: UrgenciaTrabajo;
  presupuestoEstimado: number | null;
  fotos: string[];
  barrioId: number;
  barrioNombre: string;
  estado: "abierto" | "asignado" | "cerrado" | "cancelado";
  profesionalElegidoId: string | null;
  createdAt: string;
  postulantes: PostulanteParaCliente[];
};

/**
 * Consulta el trabajo del cliente con la lista de postulantes y sus perfiles (LAB-29).
 */
export async function obtenerDetalleMiTrabajoCliente(
  trabajoId: string,
  clienteId: string,
): Promise<DetalleMiTrabajoCliente | null> {
  return conRolFalso<DetalleMiTrabajoCliente | null>(
    () => detalleDeMuestra(trabajoId),
    () => consultarDetalleMiTrabajo(trabajoId, clienteId),
  );
}

function detalleDeMuestra(trabajoId: string): DetalleMiTrabajoCliente {
  return {
    id: trabajoId,
    oficio: "gas",
    titulo: "Olor a gas en la cocina",
    descripcion: "Desde ayer hay olor a gas cerca del horno. Ya cerré la llave de paso.",
    urgencia: "esta_semana",
    presupuestoEstimado: 25000,
    fotos: [],
    barrioId: 51,
    barrioNombre: "La Perla",
    estado: "abierto",
    profesionalElegidoId: null,
    createdAt: new Date().toISOString(),
    postulantes: [],
  };
}

async function consultarDetalleMiTrabajo(
  trabajoId: string,
  clienteId: string,
): Promise<DetalleMiTrabajoCliente | null> {
  if (!supabaseConfigurado()) return null;
  const supabase = await crearClienteServidor();

  const { data: t, error } = await supabase
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
      profesional_elegido_id,
      created_at,
      barrios (nombre)
    `,
    )
    .eq("id", trabajoId)
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error || !t) return null;

  // Consulta de postulaciones en este trabajo
  const { data: posts } = await supabase
    .from("postulaciones")
    .select(
      `
      id,
      profesional_id,
      mensaje,
      precio_estimado,
      sena_propuesta,
      estado,
      created_at
    `,
    )
    .eq("trabajo_id", trabajoId)
    .neq("estado", "retirada")
    .order("created_at", { ascending: false });

  const listaPosts = posts ?? [];
  const profIds = Array.from(new Set(listaPosts.map((p) => p.profesional_id)));

  const usuariosMap = new Map<
    string,
    { nombre: string; apellidoInicial: string; fotoPath: string | null; barrioId: number | null }
  >();
  const perfilesMap = new Map<
    string,
    {
      especialidades: string | null;
      promedio: number;
      cantidadResenas: number;
      matriculado: boolean;
      oficios: Oficio[];
    }
  >();

  if (profIds.length > 0) {
    const [{ data: usrs }, { data: perfs }] = await Promise.all([
      supabase
        .from("usuarios_publicos")
        .select("id, nombre, apellido_inicial, foto_path, barrio_id")
        .in("id", profIds),
      supabase
        .from("perfiles_profesionales")
        .select("usuario_id, especialidades, promedio, cantidad_resenas, matriculado, oficios")
        .in("usuario_id", profIds),
    ]);

    if (usrs) {
      for (const u of usrs) {
        if (u.id) {
          usuariosMap.set(u.id, {
            nombre: u.nombre ?? "Profesional",
            apellidoInicial: u.apellido_inicial ?? "",
            fotoPath: u.foto_path ?? null,
            barrioId: u.barrio_id ?? null,
          });
        }
      }
    }

    if (perfs) {
      for (const p of perfs) {
        perfilesMap.set(p.usuario_id, {
          especialidades: p.especialidades,
          promedio: p.promedio !== null ? Number(p.promedio) : 0,
          cantidadResenas: p.cantidad_resenas ?? 0,
          matriculado: p.matriculado ?? false,
          oficios: (p.oficios ?? []) as Oficio[],
        });
      }
    }
  }

  // Distancias desde el barrio del trabajo: una consulta por barrio distinto, en paralelo.
  const barriosDeLosPostulantes = Array.from(usuariosMap.values())
    .map((u) => u.barrioId)
    .filter((bid): bid is number => typeof bid === "number");
  const distanciasMap = t.barrio_id
    ? await distanciasDesdeBarrio(supabase, t.barrio_id, barriosDeLosPostulantes)
    : new Map<number, number | null>();

  const postulantes: PostulanteParaCliente[] = listaPosts.map((p) => {
    const u = usuariosMap.get(p.profesional_id);
    const perf = perfilesMap.get(p.profesional_id);
    const dist = u?.barrioId ? (distanciasMap.get(u.barrioId) ?? null) : null;

    return {
      id: p.id,
      profesionalId: p.profesional_id,
      mensaje: p.mensaje,
      precioEstimado: p.precio_estimado,
      senaPropuesta: p.sena_propuesta,
      estado: p.estado as EstadoPostulacion,
      createdAt: p.created_at,
      profesional: {
        nombre: u?.nombre ?? "Profesional",
        apellidoInicial: u?.apellidoInicial ?? "",
        fotoPath: u?.fotoPath ?? null,
        especialidades: perf?.especialidades ?? null,
        promedio: perf?.promedio ?? 0,
        cantidadResenas: perf?.cantidadResenas ?? 0,
        matriculado: perf?.matriculado ?? false,
        oficios: perf?.oficios ?? [],
        distanciaKm: dist,
      },
    };
  });

  const barrioObj = t.barrios as { nombre?: string } | null;

  return {
    id: t.id,
    oficio: t.oficio as Oficio,
    titulo: t.titulo,
    descripcion: t.descripcion,
    urgencia: t.urgencia as UrgenciaTrabajo,
    presupuestoEstimado: t.presupuesto_estimado,
    // URLs firmadas de 10 min para el dueño del trabajo (LAB-52).
    fotos: await firmarFotosTrabajo(supabase, t.fotos ?? []),
    barrioId: t.barrio_id,
    barrioNombre: barrioObj?.nombre ?? "Mar del Plata",
    estado: t.estado as "abierto" | "asignado" | "cerrado" | "cancelado",
    profesionalElegidoId: t.profesional_elegido_id,
    createdAt: t.created_at,
    postulantes,
  };
}
