"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { sesionAdmin } from "@/lib/admin/sesion";
import { revocarSesionesUsuario } from "@/lib/admin/sesiones";
import { avisarCuentaSuspendida } from "@/lib/emails/avisos";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { quitarFotosDelTrabajo } from "@/lib/trabajos/quitar-fotos";
import {
  esquemaCerrarTrabajo,
  esquemaMarcarEnRevision,
  esquemaOcultarResena,
  esquemaReactivarCuenta,
  esquemaResolverReporte,
  esquemaSuspenderCuenta,
} from "@/lib/validaciones/reportes";

const SIN_PERMISO = "Solo un administrador puede realizar esta acción.";

export type ResultadoAccionModeracion = {
  ok: boolean;
  error?: string;
};

export async function marcarEnRevisionAccion(
  reporteId: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaMarcarEnRevision.safeParse({ reporteId });
  if (!parseo.success) {
    return { ok: false, error: "Identificador de reporte no válido." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("marcar_reporte_en_revision", {
    p_reporte_id: parseo.data.reporteId,
  });

  if (error) {
    return { ok: false, error: "No se pudo actualizar el estado del reporte." };
  }

  revalidatePath("/admin/reportes");
  return { ok: true };
}

export async function resolverReporteAccion(
  reporteId: string,
  resolucion: "accion_tomada" | "desestimado",
  motivo?: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaResolverReporte.safeParse({ reporteId, resolucion, motivo });
  if (!parseo.success) {
    return { ok: false, error: "Datos de resolución no válidos." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("resolver_reporte", {
    p_reporte_id: parseo.data.reporteId,
    p_con_accion: parseo.data.resolucion === "accion_tomada",
    p_motivo: parseo.data.motivo || undefined,
  });

  if (error) {
    return { ok: false, error: "No se pudo resolver el reporte." };
  }

  revalidatePath("/admin/reportes");
  return { ok: true };
}

export async function ocultarResenaAccion(
  resenaId: string,
  motivo?: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaOcultarResena.safeParse({ resenaId, motivo });
  if (!parseo.success) {
    return { ok: false, error: "Datos no válidos." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("ocultar_resena_admin", {
    p_resena_id: parseo.data.resenaId,
    p_motivo: parseo.data.motivo || undefined,
  });

  if (error) {
    return { ok: false, error: "No se pudo ocultar la reseña." };
  }

  revalidatePath("/admin/reportes");
  return { ok: true };
}

export async function cerrarTrabajoAccion(
  trabajoId: string,
  motivo?: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaCerrarTrabajo.safeParse({ trabajoId, motivo });
  if (!parseo.success) {
    return { ok: false, error: "Datos no válidos." };
  }

  const supabase = await crearClienteServidor();
  const admin = crearClienteAdmin();
  const { data: delTrabajo } = await admin
    .from("trabajos")
    .select("cliente_id")
    .eq("id", parseo.data.trabajoId)
    .maybeSingle();

  const { error } = await supabase.rpc("cerrar_trabajo_admin", {
    p_trabajo_id: parseo.data.trabajoId,
    p_motivo: parseo.data.motivo || undefined,
  });

  if (error) {
    return { ok: false, error: "No se pudo cerrar el trabajo." };
  }

  // Al cerrar por moderación se quita toda la carpeta del trabajo (LAB-52). Si Storage falla, el job
  // diario de /api/cron/limpiar-fotos-trabajos la borra: la base ya dejó el borrado programado.
  if (delTrabajo?.cliente_id) {
    const quitadas = await quitarFotosDelTrabajo(
      admin,
      delTrabajo.cliente_id,
      parseo.data.trabajoId,
    );
    if (!quitadas.ok) {
      Sentry.captureException(new Error("No se pudieron quitar las fotos al cerrar un trabajo"));
    }
  }

  revalidatePath("/admin/reportes");
  revalidatePath("/trabajos");
  return { ok: true };
}

export async function suspenderCuentaAccion(
  usuarioId: string,
  motivo: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaSuspenderCuenta.safeParse({ usuarioId, motivo });
  if (!parseo.success) {
    return {
      ok: false,
      error: parseo.error.issues[0]?.message ?? "El motivo de suspensión no es válido.",
    };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("suspender_cuenta_admin", {
    p_usuario_id: parseo.data.usuarioId,
    p_motivo: parseo.data.motivo,
  });

  if (error) {
    return { ok: false, error: "No se pudo suspender la cuenta del usuario." };
  }

  // Sin sesiones abiertas: la cuenta no vuelve a operar aunque tenga un token guardado.
  const sesionesCerradas = await revocarSesionesUsuario(parseo.data.usuarioId);
  if (!sesionesCerradas) {
    return {
      ok: false,
      error: "La cuenta quedó suspendida, pero no pudimos cerrar sus sesiones. Volvé a intentarlo.",
    };
  }

  // Notificar al usuario por email de forma asíncrona y segura
  await avisarCuentaSuspendida(parseo.data.usuarioId, parseo.data.motivo);

  revalidatePath("/admin/reportes");
  revalidatePath("/admin/verificaciones");
  return { ok: true };
}

export async function reactivarCuentaAccion(
  usuarioId: string,
  motivo?: string,
): Promise<ResultadoAccionModeracion> {
  const sesion = await sesionAdmin();
  if (!sesion) return { ok: false, error: SIN_PERMISO };

  const parseo = esquemaReactivarCuenta.safeParse({ usuarioId, motivo });
  if (!parseo.success) {
    return { ok: false, error: "Datos no válidos." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reactivar_cuenta_admin", {
    p_usuario_id: parseo.data.usuarioId,
    p_motivo: parseo.data.motivo || undefined,
  });

  if (error) {
    return { ok: false, error: "No se pudo reactivar la cuenta." };
  }

  revalidatePath("/admin/reportes");
  revalidatePath("/admin/verificaciones");
  return { ok: true };
}
