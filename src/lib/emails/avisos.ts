import "server-only";

import * as Sentry from "@sentry/nextjs";

import { formatearPesos } from "@/lib/formato";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteAdmin } from "@/lib/supabase/admin";

import { enviarAUsuario, type ClienteAdmin } from "./destinatarios";
import type { ResultadoEnvio } from "./enviar";
import { etiquetaDocumento, etiquetaOficio } from "./etiquetas";
import type { PostulacionResumen } from "@/emails/nueva_postulacion";

/**
 * Avisos por email de cada evento del producto. Son las funciones que llaman los flujos:
 *
 *   await avisarBienvenidaCliente(usuario.id)
 *
 * Se llaman solo después de verificar sesión y dueño, con ids leídos de la base.
 * Todas son seguras de llamar: **nunca lanzan** (si falta la configuración de Supabase o Resend,
 * o algo falla, no hacen nada) y reciben solo ids, nunca emails. Usan la service role porque
 * leen el email de Auth y mandan a otro usuario distinto del de la sesión.
 */

const VENTANA_AGRUPAR_MS = 10 * 60 * 1000;

async function seguro(nombre: string, tarea: (admin: ClienteAdmin) => Promise<void>) {
  try {
    await tarea(crearClienteAdmin());
  } catch {
    // Sin datos personales: solo qué aviso falló.
    Sentry.captureException(new Error(`Falló el aviso por email "${nombre}"`));
  }
}

const sitio = () => urlDelSitio();

/**
 * Corre `enviar` una sola vez por `clave` (tabla `emails_enviados`): si el flujo reintenta o un
 * usuario repite la acción, el aviso no sale dos veces. Si el envío falla, se libera la clave para
 * poder reintentar.
 */
async function unaSolaVez(
  admin: ClienteAdmin,
  clave: string,
  enviar: () => Promise<ResultadoEnvio>,
): Promise<void> {
  const { error } = await admin.from("emails_enviados").insert({ clave });
  if (error) return; // Ya se mandó (o no se pudo registrar: mejor no repetir).
  const resultado = await enviar();
  if (resultado.estado === "fallido")
    await admin.from("emails_enviados").delete().eq("clave", clave);
}

/**
 * Registro de un cliente. Enganche: lo llama la acción de registro de LAB-17.
 * Llamar solo después de verificar la sesión, con el id leído de la base (no de la entrada).
 */
export function avisarBienvenidaCliente(usuarioId: string): Promise<void> {
  return seguro("bienvenida_cliente", async (admin) => {
    await unaSolaVez(admin, `bienvenida:${usuarioId}`, () =>
      enviarAUsuario(admin, usuarioId, "bienvenida_cliente", (d) => ({
        nombre: d.nombre,
        urlBuscar: `${sitio()}/buscar`,
      })),
    );
  });
}

/**
 * El profesional envía su perfil a revisión. Enganche: lo llama la acción de LAB-18.
 * Llamar solo después de verificar la sesión, con el id leído de la base (no de la entrada).
 */
export function avisarBienvenidaProfesional(usuarioId: string): Promise<void> {
  return seguro("bienvenida_profesional", async (admin) => {
    await unaSolaVez(admin, `bienvenida:${usuarioId}`, () =>
      enviarAUsuario(admin, usuarioId, "bienvenida_profesional", (d) => ({
        nombre: d.nombre,
        urlPerfil: `${sitio()}/profesionales/${usuarioId}`,
      })),
    );
  });
}

/**
 * El admin aprobó todo y el perfil quedó publicado. Enganche: lo llama el panel de LAB-21.
 * Llamar solo después de verificar sesión y rol admin, con el id leído de la base.
 */
export function avisarPerfilPublicado(usuarioId: string): Promise<void> {
  return seguro("perfil_publicado", async (admin) => {
    await unaSolaVez(admin, `perfil_publicado:${usuarioId}`, () =>
      enviarAUsuario(admin, usuarioId, "perfil_publicado", (d) => ({
        nombre: d.nombre,
        urlPerfil: `${sitio()}/profesionales/${usuarioId}`,
        urlTrabajos: `${sitio()}/trabajos`,
      })),
    );
  });
}

/**
 * El admin rechazó un documento. Enganche: lo llama el panel de LAB-21.
 * Llamar solo después de verificar sesión y rol admin, con el id y el tipo leídos de la base.
 * Un mismo rechazo (usuario, documento y día) se avisa una sola vez.
 */
export function avisarDocumentoRechazado(
  usuarioId: string,
  tipoDocumento: string,
  motivo: string,
): Promise<void> {
  return seguro("documento_rechazado", async (admin) => {
    const dia = new Date().toISOString().slice(0, 10);
    await unaSolaVez(admin, `rechazo:${usuarioId}:${tipoDocumento}:${dia}`, () =>
      enviarAUsuario(admin, usuarioId, "documento_rechazado", (d) => ({
        nombre: d.nombre,
        documento: etiquetaDocumento(tipoDocumento),
        motivo: motivo.trim().slice(0, 500),
        urlSubir: `${sitio()}/cuenta/verificacion`,
      })),
    );
  });
}

type Pendiente = { id: string; postulacion_id: string };

async function resumenesDePostulaciones(
  admin: ClienteAdmin,
  postulacionIds: string[],
): Promise<PostulacionResumen[]> {
  const { data: postulaciones } = await admin
    .from("postulaciones")
    .select("id, profesional_id, precio_estimado, sena_propuesta, created_at")
    .in("id", postulacionIds)
    .order("created_at");
  if (!postulaciones?.length) return [];

  const profesionales = postulaciones.map((p) => p.profesional_id);
  const [{ data: usuarios }, { data: perfiles }] = await Promise.all([
    admin.from("usuarios").select("id, nombre, apellido").in("id", profesionales),
    admin
      .from("perfiles_profesionales")
      .select("usuario_id, oficios")
      .in("usuario_id", profesionales),
  ]);

  return postulaciones.map((p) => {
    const u = usuarios?.find((x) => x.id === p.profesional_id);
    const oficios = perfiles?.find((x) => x.usuario_id === p.profesional_id)?.oficios ?? [];
    return {
      nombreProfesional: [u?.nombre, u?.apellido].filter(Boolean).join(" ") || "Un profesional",
      oficio: oficios.map(etiquetaOficio).join(", "),
      precio: p.precio_estimado == null ? null : formatearPesos(p.precio_estimado),
      sena: p.sena_propuesta == null ? null : formatearPesos(p.sena_propuesta),
    };
  });
}

/** Manda un solo email con todas las postulaciones sin avisar de un trabajo. */
async function vaciarPendientes(admin: ClienteAdmin, trabajoId: string): Promise<void> {
  // Se "reclaman" de forma atómica: si dos procesos vacían a la vez, cada pendiente sale una vez.
  const { data: reclamados } = await admin
    .from("emails_pendientes")
    .update({ enviado_at: new Date().toISOString() })
    .eq("trabajo_id", trabajoId)
    .is("enviado_at", null)
    .select("id, postulacion_id");
  const pendientes: Pendiente[] = reclamados ?? [];
  if (!pendientes.length) return;

  const { data: trabajo } = await admin
    .from("trabajos")
    .select("titulo, cliente_id")
    .eq("id", trabajoId)
    .maybeSingle();
  if (!trabajo) return;

  const postulaciones = await resumenesDePostulaciones(
    admin,
    pendientes.map((p) => p.postulacion_id),
  );
  if (!postulaciones.length) return;

  await enviarAUsuario(admin, trabajo.cliente_id, "nueva_postulacion", (d) => ({
    nombre: d.nombre,
    tituloTrabajo: trabajo.titulo,
    postulaciones,
    urlTrabajo: `${sitio()}/trabajos/${trabajoId}`,
  }));
}

/**
 * Alguien se postuló a un trabajo. Agrupa: el primer aviso sale enseguida; si en los siguientes
 * 10 minutos llegan más postulaciones al mismo trabajo, se juntan en un solo email
 * ("3 profesionales se postularon a …") que sale en `vaciarPostulacionesPendientes` (cron).
 * Enganche: lo llama la acción de postulación de LAB-27.
 */
export function avisarNuevaPostulacion(postulacionId: string): Promise<void> {
  return seguro("nueva_postulacion", async (admin) => {
    const { data: postulacion } = await admin
      .from("postulaciones")
      .select("id, trabajo_id")
      .eq("id", postulacionId)
      .maybeSingle();
    if (!postulacion) return;

    await admin
      .from("emails_pendientes")
      .upsert(
        { trabajo_id: postulacion.trabajo_id, postulacion_id: postulacion.id },
        { onConflict: "postulacion_id", ignoreDuplicates: true },
      );

    const desde = new Date(Date.now() - VENTANA_AGRUPAR_MS).toISOString();
    const { data: reciente } = await admin
      .from("emails_pendientes")
      .select("id")
      .eq("trabajo_id", postulacion.trabajo_id)
      .gte("enviado_at", desde)
      .limit(1);
    if (reciente?.length) return; // Se manda junto con las demás, más tarde.

    await vaciarPendientes(admin, postulacion.trabajo_id);
  });
}

/** Cron: manda las postulaciones que esperaron más de 10 minutos para agruparse. */
export async function vaciarPostulacionesPendientes(admin: ClienteAdmin): Promise<number> {
  const limite = new Date(Date.now() - VENTANA_AGRUPAR_MS).toISOString();
  const { data } = await admin
    .from("emails_pendientes")
    .select("trabajo_id")
    .is("enviado_at", null)
    .lte("created_at", limite)
    .limit(200);
  const trabajos = [...new Set((data ?? []).map((f) => f.trabajo_id))];
  for (const trabajoId of trabajos) await vaciarPendientes(admin, trabajoId);
  return trabajos.length;
}

/**
 * El cliente eligió a un profesional: avisa al elegido ("te eligieron") y a los demás
 * postulantes ("eligieron a otro"). Nunca incluye teléfonos.
 * Enganche: lo llama la acción de elegir de LAB-28, después de verificar la sesión, con
 * `clienteId` = el id de la sesión (se compara con `trabajos.cliente_id`) y `trabajoId` leído de la
 * base. Se avisa una sola vez por trabajo.
 */
export function avisarEleccion(trabajoId: string, clienteId: string): Promise<void> {
  return seguro("eleccion", async (admin) => {
    const { data: trabajo } = await admin
      .from("trabajos")
      .select("titulo, cliente_id, profesional_elegido_id")
      .eq("id", trabajoId)
      .maybeSingle();
    if (!trabajo?.profesional_elegido_id) return;
    // `clienteId` es el de la sesión: solo el dueño del trabajo dispara este aviso.
    if (trabajo.cliente_id !== clienteId) return;
    const elegido = trabajo.profesional_elegido_id;
    const { error: yaAvisado } = await admin
      .from("emails_enviados")
      .insert({ clave: `eleccion:${trabajoId}` });
    if (yaAvisado) return;

    const { data: cliente } = await admin
      .from("usuarios")
      .select("nombre")
      .eq("id", trabajo.cliente_id)
      .maybeSingle();
    const nombreCliente = cliente?.nombre?.trim() || "El cliente";
    const urlTrabajo = `${sitio()}/trabajos/${trabajoId}`;

    await enviarAUsuario(admin, elegido, "te_eligieron", (d) => ({
      nombre: d.nombre,
      nombreCliente,
      tituloTrabajo: trabajo.titulo,
      urlTrabajo,
    }));

    const { data: otras } = await admin
      .from("postulaciones")
      .select("profesional_id")
      .eq("trabajo_id", trabajoId)
      .neq("profesional_id", elegido)
      .in("estado", ["enviada", "descartada"]);
    for (const otra of otras ?? []) {
      await enviarAUsuario(admin, otra.profesional_id, "eligieron_a_otro", (d) => ({
        nombre: d.nombre,
        tituloTrabajo: trabajo.titulo,
        urlTrabajos: `${sitio()}/trabajos`,
      }));
    }
  });
}
