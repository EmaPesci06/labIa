import "server-only";

import { urlDelSitio } from "@/lib/sitio";

import { buscarDestinatario, enviarAUsuario, type ClienteAdmin } from "./destinatarios";
import { etiquetaOficio, etiquetaUrgencia } from "./etiquetas";
import type { TrabajoResumen } from "@/emails/trabajos_cerca";

const HORA_MS = 60 * 60 * 1000;
const MAX_TRABAJOS_POR_EMAIL = 5;

type TrabajoNuevo = {
  id: string;
  titulo: string;
  oficio: string;
  barrio_id: number;
  urgencia: string;
};

/** ¿Este trabajo le sirve a este profesional? Mismo oficio y zona (o toda la ciudad). */
export function trabajoLeSirve(
  trabajo: Pick<TrabajoNuevo, "oficio" | "barrio_id">,
  perfil: { oficios: string[]; toda_la_ciudad: boolean; zonas: number[] },
): boolean {
  return (
    perfil.oficios.includes(trabajo.oficio) &&
    (perfil.toda_la_ciudad || perfil.zonas.includes(trabajo.barrio_id))
  );
}

/**
 * Resumen diario (8 h Argentina): trabajos abiertos de las últimas 24 h que coinciden con los
 * oficios y zonas de cada profesional publicado con la preferencia activa. Máximo 5 por email.
 * Devuelve cuántos emails se mandaron.
 */
export async function enviarResumenTrabajosCerca(
  admin: ClienteAdmin,
  ahora: number = Date.now(),
): Promise<number> {
  const desde = new Date(ahora - 24 * HORA_MS).toISOString();
  const { data: trabajos } = await admin
    .from("trabajos")
    .select("id, titulo, oficio, barrio_id, urgencia")
    .eq("estado", "abierto")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(500);
  if (!trabajos?.length) return 0;

  const [{ data: perfiles }, { data: barrios }, { data: apagadas }] = await Promise.all([
    admin
      .from("perfiles_profesionales")
      .select("usuario_id, oficios, toda_la_ciudad, zonas")
      .eq("publicado", true),
    admin.from("barrios").select("id, nombre"),
    admin.from("preferencias_email").select("usuario_id").eq("trabajos_cerca", false),
  ]);
  const sinAviso = new Set((apagadas ?? []).map((f) => f.usuario_id));
  const nombreBarrio = new Map((barrios ?? []).map((b) => [b.id, b.nombre]));
  const sitio = urlDelSitio();
  const dia = new Date(ahora).toISOString().slice(0, 10);

  let enviados = 0;
  for (const perfil of perfiles ?? []) {
    if (sinAviso.has(perfil.usuario_id)) continue;
    const propios = trabajos
      .filter((t) => trabajoLeSirve(t, perfil))
      .slice(0, MAX_TRABAJOS_POR_EMAIL);
    if (!propios.length) continue;

    // Un solo resumen por profesional y día, aunque el cron corra dos veces.
    const clave = `trabajos_cerca:${perfil.usuario_id}:${dia}`;
    const { error } = await admin.from("emails_enviados").insert({ clave });
    if (error) continue;

    const resumen: TrabajoResumen[] = propios.map((t) => ({
      titulo: t.titulo,
      oficio: etiquetaOficio(t.oficio),
      barrio: nombreBarrio.get(t.barrio_id) ?? "Mar del Plata",
      urgencia: etiquetaUrgencia(t.urgencia),
      url: `${sitio}/trabajos/${t.id}`,
    }));
    const resultado = await enviarAUsuario(admin, perfil.usuario_id, "trabajos_cerca", (d) => ({
      nombre: d.nombre,
      trabajos: resumen,
      urlTrabajos: `${sitio}/trabajos`,
    }));
    if (resultado.estado === "enviado") enviados += 1;
  }
  return enviados;
}

/**
 * 24 h después de marcar un trabajo como terminado, si el cliente no dejó reseña, se la pide.
 * Mira los trabajos cerrados entre 24 y 72 h atrás (el cron corre una vez por día) y no repite.
 * Devuelve cuántos emails se mandaron.
 */
export async function enviarPedidosDeResena(
  admin: ClienteAdmin,
  ahora: number = Date.now(),
): Promise<number> {
  const { data: trabajos } = await admin
    .from("trabajos")
    .select("id, cliente_id, profesional_elegido_id")
    .eq("estado", "cerrado")
    .not("profesional_elegido_id", "is", null)
    .lte("updated_at", new Date(ahora - 24 * HORA_MS).toISOString())
    .gte("updated_at", new Date(ahora - 72 * HORA_MS).toISOString())
    .limit(200);

  const sitio = urlDelSitio();
  let enviados = 0;
  for (const trabajo of trabajos ?? []) {
    const profesionalId = trabajo.profesional_elegido_id;
    if (!profesionalId) continue;

    const { data: resena } = await admin
      .from("resenas")
      .select("id")
      .eq("autor_id", trabajo.cliente_id)
      .eq("profesional_id", profesionalId)
      .maybeSingle();
    if (resena) continue;

    const { error } = await admin
      .from("emails_enviados")
      .insert({ clave: `pedir_resena:${trabajo.id}` });
    if (error) continue;

    const profesional = await buscarDestinatario(admin, profesionalId);
    const nombreProfesional = profesional?.nombreCompleto ?? "el profesional";
    const resultado = await enviarAUsuario(admin, trabajo.cliente_id, "pedir_resena", (d) => ({
      nombre: d.nombre,
      nombreProfesional,
      urlResena: `${sitio}/profesionales/${profesionalId}`,
    }));
    if (resultado.estado === "enviado") enviados += 1;
  }
  return enviados;
}
