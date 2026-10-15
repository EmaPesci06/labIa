import "server-only";

import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import {
  ETIQUETAS_MOTIVO,
  type MotivoReporte,
  type TipoObjetivo,
} from "@/lib/validaciones/reportes";

export type EstadoReporte = "abierto" | "en_revision" | "resuelto";

export type FilaReporteAdmin = {
  id: string;
  autorId: string | null;
  autorNombre: string;
  objetivoTipo: TipoObjetivo;
  objetivoId: string;
  objetivoTitulo: string;
  objetivoLink: string;
  motivo: MotivoReporte;
  motivoTexto: string;
  detalle: string | null;
  estado: EstadoReporte;
  createdAt: string;
  conteoAcumulado: number;
  usuarioAfectadoId: string | null;
  usuarioAfectadoNombre: string | null;
  usuarioAfectadoEstado: "activa" | "suspendida" | null;
  resueltoPor: string | null;
};

export type FilaResenaBajaAdmin = {
  id: string;
  autorId: string | null;
  autorNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  puntaje: number;
  texto: string | null;
  createdAt: string;
  reportada: boolean;
};

export async function listarReportes(): Promise<FilaReporteAdmin[]> {
  if (!supabaseConfigurado()) return [];

  const supabase = await crearClienteServidor();

  // 1. Obtener todos los reportes ordenados: abiertos primero, luego en_revision, luego resuelto
  const { data: reportes, error } = await supabase
    .from("reportes")
    .select(
      "id, autor_id, objetivo_tipo, objetivo_id, motivo, detalle, estado, resuelto_por, created_at",
    )
    .order("created_at", { ascending: false });

  if (error || !reportes) return [];

  // Conteo acumulado por (objetivo_tipo, objetivo_id)
  const conteos = new Map<string, number>();
  for (const r of reportes) {
    const clave = `${r.objetivo_tipo}:${r.objetivo_id}`;
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  }

  // Recolectar autores
  const autorIds = [
    ...new Set(reportes.map((r) => r.autor_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: autores } =
    autorIds.length > 0
      ? await supabase.from("usuarios").select("id, nombre, apellido").in("id", autorIds)
      : { data: [] };
  const autoresMap = new Map(
    (autores ?? []).map((u) => [
      u.id,
      [u.nombre, u.apellido].filter(Boolean).join(" ") || "Usuario",
    ]),
  );

  // Recolectar objetivos
  const perfilIds = reportes.filter((r) => r.objetivo_tipo === "perfil").map((r) => r.objetivo_id);
  const trabajoIds = reportes
    .filter((r) => r.objetivo_tipo === "trabajo")
    .map((r) => r.objetivo_id);
  const resenaIds = reportes.filter((r) => r.objetivo_tipo === "resena").map((r) => r.objetivo_id);

  // Perfiles objetivos
  const { data: usuariosPerfiles } =
    perfilIds.length > 0
      ? await supabase.from("usuarios").select("id, nombre, apellido, estado").in("id", perfilIds)
      : { data: [] };
  const perfilesMap = new Map((usuariosPerfiles ?? []).map((u) => [u.id, u]));

  // Trabajos objetivos
  const { data: trabajos } =
    trabajoIds.length > 0
      ? await supabase
          .from("trabajos")
          .select("id, titulo, cliente_id, estado")
          .in("id", trabajoIds)
      : { data: [] };
  const trabajosMap = new Map((trabajos ?? []).map((t) => [t.id, t]));

  // Clientes de trabajos
  const clientesTrabajosIds = [...new Set((trabajos ?? []).map((t) => t.cliente_id))];
  const { data: clientesTrabajos } =
    clientesTrabajosIds.length > 0
      ? await supabase
          .from("usuarios")
          .select("id, nombre, apellido, estado")
          .in("id", clientesTrabajosIds)
      : { data: [] };
  const clientesTrabajosMap = new Map((clientesTrabajos ?? []).map((u) => [u.id, u]));

  // Reseñas objetivos
  const { data: resenas } =
    resenaIds.length > 0
      ? await supabase
          .from("resenas")
          .select("id, autor_id, profesional_id, puntaje, texto")
          .in("id", resenaIds)
      : { data: [] };
  const resenasMap = new Map((resenas ?? []).map((r) => [r.id, r]));

  // Usuarios autores de reseñas
  const autoresResenasIds = [
    ...new Set((resenas ?? []).map((r) => r.autor_id).filter((id): id is string => Boolean(id))),
  ];
  const { data: autoresResenas } =
    autoresResenasIds.length > 0
      ? await supabase
          .from("usuarios")
          .select("id, nombre, apellido, estado")
          .in("id", autoresResenasIds)
      : { data: [] };
  const autoresResenasMap = new Map((autoresResenas ?? []).map((u) => [u.id, u]));

  // Mapear cada reporte a FilaReporteAdmin
  const filas: FilaReporteAdmin[] = reportes.map((r) => {
    const autorNombre = r.autor_id ? (autoresMap.get(r.autor_id) ?? "Usuario") : "Usuario anónimo";
    const conteoAcumulado = conteos.get(`${r.objetivo_tipo}:${r.objetivo_id}`) ?? 1;

    let objetivoTitulo = "Objetivo";
    let objetivoLink = "#";
    let usuarioAfectadoId: string | null = null;
    let usuarioAfectadoNombre: string | null = null;
    let usuarioAfectadoEstado: "activa" | "suspendida" | null = null;

    if (r.objetivo_tipo === "perfil") {
      const u = perfilesMap.get(r.objetivo_id);
      usuarioAfectadoId = r.objetivo_id;
      usuarioAfectadoEstado = (u?.estado as "activa" | "suspendida") ?? null;
      usuarioAfectadoNombre = u ? [u.nombre, u.apellido].filter(Boolean).join(" ") : "Profesional";
      objetivoTitulo = `Perfil de ${usuarioAfectadoNombre}`;
      objetivoLink = `/profesionales/${r.objetivo_id}`;
    } else if (r.objetivo_tipo === "trabajo") {
      const t = trabajosMap.get(r.objetivo_id);
      if (t) {
        const c = clientesTrabajosMap.get(t.cliente_id);
        usuarioAfectadoId = t.cliente_id;
        usuarioAfectadoEstado = (c?.estado as "activa" | "suspendida") ?? null;
        usuarioAfectadoNombre = c ? [c.nombre, c.apellido].filter(Boolean).join(" ") : "Cliente";
        objetivoTitulo = `Trabajo: "${t.titulo}" (${t.estado})`;
        objetivoLink = `/trabajos/${t.id}`;
      } else {
        objetivoTitulo = "Trabajo (eliminado o cancelado)";
        objetivoLink = "#";
      }
    } else if (r.objetivo_tipo === "resena") {
      const res = resenasMap.get(r.objetivo_id);
      if (res) {
        const a = res.autor_id ? autoresResenasMap.get(res.autor_id) : null;
        usuarioAfectadoId = res.autor_id;
        usuarioAfectadoEstado = (a?.estado as "activa" | "suspendida") ?? null;
        usuarioAfectadoNombre = a
          ? [a.nombre, a.apellido].filter(Boolean).join(" ")
          : "Autor de reseña";
        objetivoTitulo = `Reseña de ${usuarioAfectadoNombre} (${res.puntaje}★): "${res.texto ?? "sin texto"}"`;
        objetivoLink = `/profesionales/${res.profesional_id}`;
      } else {
        objetivoTitulo = "Reseña (ocultada o eliminada)";
        objetivoLink = "#";
      }
    }

    return {
      id: r.id,
      autorId: r.autor_id,
      autorNombre,
      objetivoTipo: r.objetivo_tipo as TipoObjetivo,
      objetivoId: r.objetivo_id,
      objetivoTitulo,
      objetivoLink,
      motivo: r.motivo as MotivoReporte,
      motivoTexto: ETIQUETAS_MOTIVO[r.motivo as MotivoReporte] ?? r.motivo,
      detalle: r.detalle,
      estado: r.estado as EstadoReporte,
      createdAt: r.created_at,
      conteoAcumulado,
      usuarioAfectadoId,
      usuarioAfectadoNombre,
      usuarioAfectadoEstado,
      resueltoPor: r.resuelto_por,
    };
  });

  // Ordenar: primero 'abierto', segundo 'en_revision', último 'resuelto'
  const pesoEstado = (e: EstadoReporte) => (e === "abierto" ? 0 : e === "en_revision" ? 1 : 2);
  filas.sort((a, b) => {
    const orden = pesoEstado(a.estado) - pesoEstado(b.estado);
    if (orden !== 0) return orden;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return filas;
}

export async function listarResenasBajas(): Promise<FilaResenaBajaAdmin[]> {
  if (!supabaseConfigurado()) return [];

  const supabase = await crearClienteServidor();

  // Obtener reseñas con puntaje <= 2
  const { data: resenas, error } = await supabase
    .from("resenas")
    .select("id, autor_id, profesional_id, puntaje, texto, created_at")
    .lte("puntaje", 2)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error || !resenas) return [];

  const autorIds = [
    ...new Set(resenas.map((r) => r.autor_id).filter((id): id is string => Boolean(id))),
  ];
  const proIds = [...new Set(resenas.map((r) => r.profesional_id))];

  const todosUsuariosIds = [...new Set([...autorIds, ...proIds])];
  const { data: usuarios } =
    todosUsuariosIds.length > 0
      ? await supabase.from("usuarios").select("id, nombre, apellido").in("id", todosUsuariosIds)
      : { data: [] };
  const usuariosMap = new Map(
    (usuarios ?? []).map((u) => [
      u.id,
      [u.nombre, u.apellido].filter(Boolean).join(" ") || "Usuario",
    ]),
  );

  // Verificar si ya tienen reporte
  const resenaIds = resenas.map((r) => r.id);
  const { data: reportesExistentes } =
    resenaIds.length > 0
      ? await supabase
          .from("reportes")
          .select("objetivo_id")
          .eq("objetivo_tipo", "resena")
          .in("objetivo_id", resenaIds)
      : { data: [] };
  const reportadasSet = new Set((reportesExistentes ?? []).map((r) => r.objetivo_id));

  return resenas.map((r) => ({
    id: r.id,
    autorId: r.autor_id,
    autorNombre: r.autor_id ? (usuariosMap.get(r.autor_id) ?? "Cliente") : "Cliente anónimo",
    profesionalId: r.profesional_id,
    profesionalNombre: usuariosMap.get(r.profesional_id) ?? "Profesional",
    puntaje: r.puntaje,
    texto: r.texto,
    createdAt: r.created_at,
    reportada: reportadasSet.has(r.id),
  }));
}
