"use server";

import { headers } from "next/headers";

import { erroresPorCampo } from "@/lib/validaciones/auth";
import { limitarIntentos } from "@/lib/rate-limit";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import {
  esRutaFotoPerfil,
  esRutaFotoTrabajo,
  esquemaCuentaNueva,
  esquemaPerfilProfesional,
  leerPerfilProfesional,
  MAX_FOTOS_TRABAJOS,
} from "@/lib/validaciones/perfil-profesional";

import type { EstadoPerfil } from "./tipos";

// Paso 1 del registro de profesional (LAB-18). Cada acción valida sesión, rol y entrada.

const REGLA_CUENTA_NUEVA = { maximo: 5, ventanaMs: 60_000 } as const;
const REGLA_GUARDAR = { maximo: 30, ventanaMs: 60_000 } as const;

const MENSAJE_SIN_SUPABASE = "El registro todavía no está disponible. Probá de nuevo más tarde.";
const MENSAJE_ERROR_GENERAL = "No pudimos guardar tu perfil. Probá de nuevo en unos minutos.";

async function ipDelPedido(): Promise<string> {
  const encabezados = await headers();
  const reenviado = encabezados.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviado || encabezados.get("x-real-ip") || "desconocida";
}

async function superaElLimite(
  accion: string,
  regla: { maximo: number; ventanaMs: number },
): Promise<EstadoPerfil | null> {
  const resultado = limitarIntentos(`${accion}:${await ipDelPedido()}`, regla);
  if (resultado.permitido) return null;
  return {
    mensaje: `Hiciste demasiados intentos. Esperá ${resultado.segundosParaReintentar} segundos y probá de nuevo.`,
  };
}

/** Errores de Supabase Auth que se muestran junto al campo o como mensaje general. */
function errorDeCuenta(codigo: string | undefined, estado: number | undefined): EstadoPerfil {
  switch (codigo) {
    case "user_already_exists":
    case "email_exists":
      return {
        errores: { email: "Ya hay una cuenta con ese email. Ingresá o recuperá tu contraseña." },
      };
    case "weak_password":
      return { errores: { contrasena: "La contraseña es muy fácil de adivinar. Probá con otra." } };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { mensaje: "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo." };
    default:
      return {
        mensaje:
          estado === 400 || estado === 422
            ? "Revisá los datos e intentá de nuevo."
            : MENSAJE_ERROR_GENERAL,
      };
  }
}

/**
 * Guarda el perfil del profesional (paso 1). Sin sesión, primero crea la cuenta con email y
 * contraseña (`rol: 'profesional'`). Si el proyecto exige confirmar el email, deja el perfil en
 * `user_metadata.perfil_borrador` para rellenar el formulario al volver. Las insignias y `publicado`
 * no se tocan: la base lo impide.
 */
export async function guardarPerfilProfesional(
  _anterior: EstadoPerfil,
  datos: FormData,
): Promise<EstadoPerfil> {
  const entrada = leerPerfilProfesional(datos);
  const resultado = esquemaPerfilProfesional.safeParse(entrada);
  const errores = resultado.success ? {} : erroresPorCampo(resultado.error);

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE };
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  let usuario = auth.user;

  const email = typeof datos.get("email") === "string" ? String(datos.get("email")) : "";
  const contrasena =
    typeof datos.get("contrasena") === "string" ? String(datos.get("contrasena")) : "";

  if (!usuario) {
    const cuenta = esquemaCuentaNueva.safeParse({ email, contrasena });
    if (!cuenta.success) Object.assign(errores, erroresPorCampo(cuenta.error));
  }
  if (!resultado.success || Object.keys(errores).length > 0) {
    return { errores, mensaje: "Revisá los campos marcados en rojo." };
  }
  const perfil = resultado.data;

  const bloqueado = await superaElLimite(
    usuario ? "perfil-profesional" : "registro-profesional",
    usuario ? REGLA_GUARDAR : REGLA_CUENTA_NUEVA,
  );
  if (bloqueado) return bloqueado;

  if (!usuario) {
    const cuenta = esquemaCuentaNueva.parse({ email, contrasena });
    const { data, error } = await supabase.auth.signUp({
      email: cuenta.email,
      password: cuenta.contrasena,
      options: {
        // El trigger `al_crear_usuario` toma rol y nombre de acá y solo acepta cliente/profesional.
        data: {
          rol: "profesional",
          nombre: perfil.nombre,
          apellido: perfil.apellido,
          perfil_borrador: {
            nombreCompleto: perfil.nombreCompleto,
            whatsapp: perfil.whatsapp,
            barrioId: String(perfil.barrioId),
            oficios: perfil.oficios,
            especialidades: perfil.especialidades ?? "",
            todaLaCiudad: perfil.todaLaCiudad,
            zonas: perfil.zonas,
            aniosExperiencia:
              perfil.aniosExperiencia === null ? "" : String(perfil.aniosExperiencia),
            matricula: perfil.matricula ?? "",
            descripcion: perfil.descripcion ?? "",
            disponibilidad: perfil.disponibilidad ?? "",
          },
        },
        emailRedirectTo: `${urlDelSitio()}/api/auth/callback?rol=profesional`,
      },
    });
    if (error) return errorDeCuenta(error.code, error.status);
    if (!data.session || !data.user) {
      return {
        exito:
          "Te enviamos un email para confirmar tu cuenta. Tocá el enlace y volvé: vas a encontrar tu perfil como lo dejaste.",
      };
    }
    usuario = data.user;
  }

  const uid = usuario.id;
  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", uid)
    .maybeSingle();
  if (!fila || fila.estado !== "activa") {
    return { mensaje: "Tu cuenta no está activa. Escribinos si creés que es un error." };
  }
  if (fila.rol !== "profesional") {
    return { mensaje: "Esta cuenta no es de profesional, así que no puede armar un perfil." };
  }

  // Las rutas de fotos que llegan del navegador tienen que ser de la carpeta de esta persona.
  const fotoPerfil = perfil.fotoPerfil || null;
  if (fotoPerfil && !esRutaFotoPerfil(fotoPerfil, uid)) {
    return { mensaje: "No pudimos validar la foto de perfil. Quitala y subila de nuevo." };
  }
  if (!perfil.fotosTrabajos.every((ruta) => esRutaFotoTrabajo(ruta, uid))) {
    return { mensaje: "No pudimos validar las fotos de trabajos. Quitalas y subilas de nuevo." };
  }

  const { error: errorUsuario } = await supabase
    .from("usuarios")
    .update({
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      barrio_id: perfil.barrioId,
      foto_path: fotoPerfil,
    })
    .eq("id", uid);
  if (errorUsuario) {
    return errorUsuario.code === "23503"
      ? { errores: { barrioId: "Elegí un barrio de la lista." } }
      : { mensaje: MENSAJE_ERROR_GENERAL };
  }

  // El WhatsApp no se actualiza con un UPDATE: pasa por la función de la base (LAB-12).
  const { error: errorWhatsapp } = await supabase.rpc("actualizar_whatsapp", {
    p_whatsapp: perfil.whatsapp,
  });
  if (errorWhatsapp) return { mensaje: MENSAJE_ERROR_GENERAL };

  const campos = {
    oficios: perfil.oficios,
    especialidades: perfil.especialidades,
    descripcion: perfil.descripcion,
    anios_experiencia: perfil.aniosExperiencia,
    toda_la_ciudad: perfil.todaLaCiudad,
    zonas: perfil.zonas,
    disponibilidad: perfil.disponibilidad,
    fotos_trabajos: perfil.fotosTrabajos,
    matricula_numero: perfil.matricula,
  };
  const { data: existente } = await supabase
    .from("perfiles_profesionales")
    .select("usuario_id")
    .eq("usuario_id", uid)
    .maybeSingle();
  const { error: errorPerfil } = existente
    ? await supabase.from("perfiles_profesionales").update(campos).eq("usuario_id", uid)
    : await supabase.from("perfiles_profesionales").insert({ usuario_id: uid, ...campos });
  if (errorPerfil) return { mensaje: MENSAJE_ERROR_GENERAL };

  // Ya está todo en la base: el borrador (con el WhatsApp) no tiene que quedar en el JWT.
  if (usuario.user_metadata?.perfil_borrador) {
    await supabase.auth.updateUser({ data: { perfil_borrador: null } });
  }

  return { guardado: { uid } };
}

/**
 * Registra en la base las fotos que el navegador ya subió al bucket `fotos` (la subida va directo
 * a Storage con la sesión de la persona). Valida que cada ruta esté en su propia carpeta.
 */
export async function guardarFotosPerfil(entrada: {
  fotoPerfil: string | null;
  fotosTrabajos: string[];
}): Promise<{ ok: boolean; mensaje?: string }> {
  if (!supabaseConfigurado()) return { ok: false, mensaje: MENSAJE_SIN_SUPABASE };
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, mensaje: "Tu sesión venció. Ingresá de nuevo." };
  const uid = auth.user.id;

  const bloqueado = await superaElLimite("fotos-profesional", REGLA_GUARDAR);
  if (bloqueado) return { ok: false, mensaje: bloqueado.mensaje };

  const { fotoPerfil, fotosTrabajos } = entrada;
  const valida =
    (fotoPerfil === null ||
      (typeof fotoPerfil === "string" && esRutaFotoPerfil(fotoPerfil, uid))) &&
    Array.isArray(fotosTrabajos) &&
    fotosTrabajos.length <= MAX_FOTOS_TRABAJOS &&
    fotosTrabajos.every((ruta) => typeof ruta === "string" && esRutaFotoTrabajo(ruta, uid));
  if (!valida) return { ok: false, mensaje: "No pudimos validar las fotos." };

  const { data: fila } = await supabase.from("usuarios").select("rol").eq("id", uid).maybeSingle();
  if (fila?.rol !== "profesional")
    return { ok: false, mensaje: "Esta cuenta no es de profesional." };

  const { error: errorUsuario } = await supabase
    .from("usuarios")
    .update({ foto_path: fotoPerfil })
    .eq("id", uid);
  const { error: errorPerfil } = await supabase
    .from("perfiles_profesionales")
    .update({ fotos_trabajos: fotosTrabajos })
    .eq("usuario_id", uid);
  if (errorUsuario || errorPerfil) return { ok: false, mensaje: MENSAJE_ERROR_GENERAL };
  return { ok: true };
}
