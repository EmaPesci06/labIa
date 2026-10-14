import "server-only";

import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import type { Oficio } from "@/lib/oficios";

import {
  pendienteDesde as pendienteDesdeDe,
  pestanaDe,
  type DocumentoAdmin,
  type Pestana,
} from "./logica";

/** Una fila del listado: un profesional con al menos un documento cargado. */
export type FilaProfesional = {
  usuarioId: string;
  nombre: string;
  apellido: string | null;
  oficios: Oficio[];
  barrio: string | null;
  documentos: DocumentoAdmin[];
  pestana: Pestana;
  /** Desde cuándo espera el documento más viejo pendiente, o `null`. */
  pendienteDesde: string | null;
  pendientes: number;
};

export type DetalleProfesional = {
  usuarioId: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  whatsapp: string | null;
  barrio: string | null;
  oficios: Oficio[];
  matricula: string | null;
  normasVersion: string | null;
  normasAceptadasAt: string | null;
  publicado: boolean;
  identidadVerificada: boolean;
  antecedentesOk: boolean;
  matriculado: boolean;
  documentos: DocumentoAdmin[];
};

type FilaVerificacion = {
  id: string;
  usuario_id: string;
  tipo: DocumentoAdmin["tipo"];
  estado: DocumentoAdmin["estado"];
  motivo_rechazo: string | null;
  created_at: string;
  revisado_at: string | null;
  archivo_borrado_at: string | null;
};

const COLUMNAS_VERIFICACION =
  "id, usuario_id, tipo, estado, motivo_rechazo, created_at, revisado_at, archivo_borrado_at";

function aDocumento(fila: FilaVerificacion): DocumentoAdmin {
  return {
    id: fila.id,
    tipo: fila.tipo,
    estado: fila.estado,
    motivoRechazo: fila.motivo_rechazo,
    createdAt: fila.created_at,
    revisadoAt: fila.revisado_at,
    archivoBorrado: fila.archivo_borrado_at !== null,
  };
}

/**
 * Listado del panel: profesionales con documentos, agrupados y con su pestaña. La lectura va con la
 * sesión del admin: la RLS (rol admin) es la que deja ver las filas.
 */
export async function listarProfesionales(): Promise<FilaProfesional[]> {
  if (!supabaseConfigurado()) return [];
  const cliente = await crearClienteServidor();
  const { data: verificaciones } = await cliente
    .from("verificaciones")
    .select(COLUMNAS_VERIFICACION)
    .order("created_at", { ascending: false });
  const filas = (verificaciones ?? []) as FilaVerificacion[];
  if (filas.length === 0) return [];

  const ids = [...new Set(filas.map((f) => f.usuario_id))];
  const { data: usuarios } = await cliente
    .from("usuarios")
    .select("id, nombre, apellido, barrio_id")
    .in("id", ids);
  const { data: perfiles } = await cliente
    .from("perfiles_profesionales")
    .select("usuario_id, oficios")
    .in("usuario_id", ids);

  const barrioIds = [
    ...new Set((usuarios ?? []).map((u) => u.barrio_id).filter((b): b is number => b !== null)),
  ];
  const { data: barrios } = barrioIds.length
    ? await cliente.from("barrios").select("id, nombre").in("id", barrioIds)
    : { data: [] };

  const documentosPorUsuario = new Map<string, DocumentoAdmin[]>();
  for (const fila of filas) {
    const lista = documentosPorUsuario.get(fila.usuario_id) ?? [];
    lista.push(aDocumento(fila));
    documentosPorUsuario.set(fila.usuario_id, lista);
  }

  const resultado: FilaProfesional[] = [];
  for (const [usuarioId, documentos] of documentosPorUsuario) {
    const pestana = pestanaDe(documentos);
    if (!pestana) continue;
    const usuario = usuarios?.find((u) => u.id === usuarioId);
    const perfil = perfiles?.find((p) => p.usuario_id === usuarioId);
    const barrio = barrios?.find((b) => b.id === usuario?.barrio_id);
    resultado.push({
      usuarioId,
      nombre: usuario?.nombre ?? "Sin nombre",
      apellido: usuario?.apellido ?? null,
      oficios: perfil?.oficios ?? [],
      barrio: barrio?.nombre ?? null,
      documentos,
      pestana,
      pendienteDesde: pendienteDesdeDe(documentos),
      pendientes: documentos.filter((d) => d.estado === "pendiente").length,
    });
  }

  // Pendientes: el que más tiempo espera, primero. Las demás pestañas, por nombre.
  return resultado.sort((a, b) => {
    if (a.pendienteDesde && b.pendienteDesde)
      return a.pendienteDesde.localeCompare(b.pendienteDesde);
    if (a.pendienteDesde) return -1;
    if (b.pendienteDesde) return 1;
    return a.nombre.localeCompare(b.nombre);
  });
}

async function emailDe(usuarioId: string): Promise<string | null> {
  try {
    const { data } = await crearClienteAdmin().auth.admin.getUserById(usuarioId);
    return data.user?.email ?? null;
  } catch {
    // Sin email en el detalle: el resto de la pantalla igual se puede revisar.
    return null;
  }
}

/**
 * Detalle de un profesional para revisar sus documentos. `null` si no existe o no es profesional
 * (la página responde 404). Matrícula: sale de la vista `matricula_propia`, que solo lee el admin.
 */
export async function obtenerDetalleProfesional(
  usuarioId: string,
): Promise<DetalleProfesional | null> {
  if (!supabaseConfigurado()) return null;
  const cliente = await crearClienteServidor();
  const { data: usuario } = await cliente
    .from("usuarios")
    .select("id, rol, nombre, apellido, whatsapp, barrio_id, normas_version, normas_aceptadas_at")
    .eq("id", usuarioId)
    .maybeSingle();
  if (!usuario || usuario.rol !== "profesional") return null;

  const [perfil, matricula, verificaciones, barrio, email] = await Promise.all([
    cliente
      .from("perfiles_profesionales")
      .select("oficios, publicado, identidad_verificada, antecedentes_ok, matriculado")
      .eq("usuario_id", usuarioId)
      .maybeSingle(),
    cliente
      .from("matricula_propia")
      .select("matricula_numero")
      .eq("usuario_id", usuarioId)
      .maybeSingle(),
    cliente
      .from("verificaciones")
      .select(COLUMNAS_VERIFICACION)
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false }),
    usuario.barrio_id
      ? cliente.from("barrios").select("nombre").eq("id", usuario.barrio_id).maybeSingle()
      : Promise.resolve({ data: null }),
    emailDe(usuarioId),
  ]);

  return {
    usuarioId,
    nombre: usuario.nombre ?? "Sin nombre",
    apellido: usuario.apellido,
    email,
    whatsapp: usuario.whatsapp,
    barrio: barrio.data?.nombre ?? null,
    oficios: perfil.data?.oficios ?? [],
    matricula: matricula.data?.matricula_numero ?? null,
    normasVersion: usuario.normas_version,
    normasAceptadasAt: usuario.normas_aceptadas_at,
    publicado: perfil.data?.publicado ?? false,
    identidadVerificada: perfil.data?.identidad_verificada ?? false,
    antecedentesOk: perfil.data?.antecedentes_ok ?? false,
    matriculado: perfil.data?.matriculado ?? false,
    documentos: ((verificaciones.data ?? []) as FilaVerificacion[]).map(aDocumento),
  };
}
