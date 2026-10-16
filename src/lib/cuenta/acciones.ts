"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { EstadoFormulario } from "@/lib/auth/estado";
import { guardarDatosDeCliente } from "@/lib/auth/datos-de-cliente";
import { limitarPersistente, limitarPorIp } from "@/lib/rate-limit-persistente";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import type { Database } from "@/lib/supabase/tipos";
import { erroresPorCampo, esquemaNuevaContrasena } from "@/lib/validaciones/auth";
import {
  esquemaBorrarCuenta,
  esquemaCambiarEmail,
  esquemaContrasenaActual,
  esquemaDatosCuenta,
} from "@/lib/validaciones/cuenta";
import { esRutaFotoPerfil } from "@/lib/validaciones/perfil-profesional";
import { separarNombre } from "@/lib/validaciones/registro-cliente";

import { borrarCuentaDeUsuario } from "./borrado";
import { ingresoReciente, tieneContrasena } from "./proveedor";

const REGLA = { maximo: 10, ventanaMs: 60_000 } as const;
const REGLA_BORRAR = { maximo: 3, ventanaMs: 60_000 } as const;
const SIN_SUPABASE = "Esta función todavía no está disponible. Probá de nuevo más tarde.";
const ERROR_GENERAL = "No pudimos guardar los cambios. Probá de nuevo en unos minutos.";

const texto = (datos: FormData, clave: string): string => {
  const valor = datos.get(clave);
  return typeof valor === "string" ? valor : "";
};

/** Límite por persona (y por IP) para estas acciones, compartido entre instancias (LAB-41). */
async function superaElLimite(
  accion: string,
  uid: string,
  regla: { maximo: number; ventanaMs: number } = REGLA,
): Promise<string | null> {
  const porUsuario = await limitarPersistente(`cuenta-${accion}:${uid}`, regla);
  const porIp = await limitarPorIp(`cuenta-${accion}-ip`, regla);
  const bloqueo = !porUsuario.permitido ? porUsuario : !porIp.permitido ? porIp : null;
  return bloqueo
    ? `Hiciste demasiados intentos. Esperá ${bloqueo.segundosParaReintentar} segundos y probá de nuevo.`
    : null;
}

function mensajeDeAuth(codigo: string | undefined): string {
  switch (codigo) {
    case "weak_password":
      return "La contraseña es muy fácil de adivinar. Probá con otra más larga.";
    case "same_password":
      return "La nueva contraseña tiene que ser distinta de la anterior.";
    case "email_exists":
    case "user_already_exists":
      return "Ya hay una cuenta con ese email.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.";
    case "reauthentication_needed":
      return "Por seguridad, volvé a ingresar y probá de nuevo.";
    default:
      return ERROR_GENERAL;
  }
}

/** Sesión con una cuenta activa de cliente o profesional, o el mensaje de por qué no. */
async function sesionDeCuenta() {
  if (!supabaseConfigurado()) return { error: SIN_SUPABASE } as const;
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión venció. Ingresá de nuevo." } as const;
  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!fila || fila.estado !== "activa" || fila.rol === "admin") {
    return { error: "No podés hacer este cambio con esta cuenta." } as const;
  }
  return { supabase, usuario: data.user, rol: fila.rol } as const;
}

/** "Mis datos": nombre, WhatsApp y barrio. Valida igual que el registro. */
export async function guardarDatos(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const entrada = {
    nombreCompleto: texto(datos, "nombreCompleto"),
    whatsapp: texto(datos, "whatsapp"),
    barrio: texto(datos, "barrio"),
  };
  const resultado = esquemaDatosCuenta.safeParse(entrada);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores: entrada };

  const sesion = await sesionDeCuenta();
  if ("error" in sesion) return { mensaje: sesion.error, valores: entrada };
  const limite = await superaElLimite("datos", sesion.usuario.id);
  if (limite) return { mensaje: limite, valores: entrada };

  const { nombre, apellido } = separarNombre(resultado.data.nombreCompleto);
  const guardado = await guardarDatosDeCliente(sesion.supabase, sesion.usuario.id, {
    whatsapp: resultado.data.whatsapp,
    barrioId: resultado.data.barrio,
    nombre,
    apellido,
  });
  if (!guardado) return { mensaje: ERROR_GENERAL, valores: entrada };

  revalidatePath("/cuenta", "layout");
  return { exito: "Guardamos tus cambios.", valores: entrada };
}

/** Cambio de email: Supabase manda un mail de confirmación a la dirección nueva. */
export async function cambiarEmail(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const entrada = { email: texto(datos, "email") };
  const resultado = esquemaCambiarEmail.safeParse({ ...entrada, actual: texto(datos, "actual") });
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores: entrada };

  const sesion = await sesionDeCuenta();
  if ("error" in sesion) return { mensaje: sesion.error, valores: entrada };
  if (!tieneContrasena(sesion.usuario)) {
    return {
      mensaje: "Tu cuenta ingresa con Google: el email lo maneja Google.",
      valores: entrada,
    };
  }
  const limite = await superaElLimite("email", sesion.usuario.id);
  if (limite) return { mensaje: limite, valores: entrada };
  if (!(await contrasenaActualValida(sesion.usuario.email, resultado.data.actual))) {
    return { errores: { actual: "La contraseña actual no coincide." }, valores: entrada };
  }
  if (resultado.data.email === sesion.usuario.email) {
    return { errores: { email: "Es el mismo email que ya tenés." }, valores: entrada };
  }

  const { error } = await sesion.supabase.auth.updateUser(
    { email: resultado.data.email },
    {
      emailRedirectTo: `${urlDelSitio()}/api/auth/callback?siguiente=${encodeURIComponent("/cuenta/datos")}`,
    },
  );
  if (error) return { mensaje: mensajeDeAuth(error.code), valores: entrada };
  return {
    exito: `Te enviamos un mail a ${resultado.data.email} para confirmar el cambio. Hasta entonces seguís entrando con tu email actual.`,
    valores: entrada,
  };
}

/** Cambio de contraseña (solo cuentas con email y contraseña). */
export async function cambiarContrasena(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaNuevaContrasena.safeParse({
    contrasena: texto(datos, "contrasena"),
    repetir: texto(datos, "repetir"),
  });
  const actual = esquemaContrasenaActual.safeParse({ actual: texto(datos, "actual") });
  if (!resultado.success || !actual.success) {
    return {
      errores: {
        ...(actual.success ? {} : erroresPorCampo(actual.error)),
        ...(resultado.success ? {} : erroresPorCampo(resultado.error)),
      },
    };
  }

  const sesion = await sesionDeCuenta();
  if ("error" in sesion) return { mensaje: sesion.error };
  if (!tieneContrasena(sesion.usuario)) {
    return { mensaje: "Tu cuenta ingresa con Google: no tiene contraseña de LabÍA." };
  }
  const limite = await superaElLimite("contrasena", sesion.usuario.id);
  if (limite) return { mensaje: limite };

  if (!(await contrasenaActualValida(sesion.usuario.email, actual.data.actual))) {
    return { errores: { actual: "La contraseña actual no coincide." } };
  }

  const { error } = await sesion.supabase.auth.updateUser({ password: resultado.data.contrasena });
  if (error) return { mensaje: mensajeDeAuth(error.code) };
  return { exito: "Cambiamos tu contraseña." };
}

/**
 * Registra la foto de perfil que el navegador ya subió a `fotos/perfiles/<uid>/…` (o la quita con
 * `null`) y borra la anterior del bucket.
 */
export async function guardarFotoDePerfil(
  ruta: string | null,
): Promise<{ ok: boolean; mensaje?: string }> {
  const sesion = await sesionDeCuenta();
  if ("error" in sesion) return { ok: false, mensaje: sesion.error };
  const uid = sesion.usuario.id;
  if (ruta !== null && !(typeof ruta === "string" && esRutaFotoPerfil(ruta, uid))) {
    return { ok: false, mensaje: "No pudimos validar la foto. Subila de nuevo." };
  }
  const limite = await superaElLimite("foto", uid);
  if (limite) return { ok: false, mensaje: limite };

  const { data: anterior } = await sesion.supabase
    .from("usuarios")
    .select("foto_path")
    .eq("id", uid)
    .maybeSingle();
  const { error } = await sesion.supabase
    .from("usuarios")
    .update({ foto_path: ruta })
    .eq("id", uid);
  if (error) return { ok: false, mensaje: ERROR_GENERAL };

  const vieja = anterior?.foto_path;
  if (vieja && vieja !== ruta && esRutaFotoPerfil(vieja, uid)) {
    // Si no se puede borrar la anterior, queda huérfana pero la cuenta ya está bien.
    await sesion.supabase.storage.from("fotos").remove([vieja]);
  }
  revalidatePath("/cuenta", "layout");
  return { ok: true };
}

const contrasenaActualValida = (email: string | undefined | null, contrasena: string) =>
  email ? contrasenaCorrecta(email, contrasena) : Promise.resolve(false);

/** ¿La contraseña es la de esta cuenta? Usa un cliente aparte: no toca la sesión del navegador. */
async function contrasenaCorrecta(email: string, contrasena: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) return false;
  const aparte = createClient<Database>(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await aparte.auth.signInWithPassword({ email, password: contrasena });
  return !error;
}

/**
 * Borrar la cuenta. Exige escribir BORRAR y reautenticar (contraseña, o un ingreso con Google de
 * los últimos minutos). Después corre el job de servidor con la service role y cierra la sesión.
 */
export async function borrarMiCuenta(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaBorrarCuenta.safeParse({
    confirmacion: texto(datos, "confirmacion"),
    contrasena: texto(datos, "contrasena") || undefined,
  });
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  const sesion = await sesionDeCuenta();
  if ("error" in sesion) return { mensaje: sesion.error };
  const limite = await superaElLimite("borrar", sesion.usuario.id, REGLA_BORRAR);
  if (limite) return { mensaje: limite };

  if (tieneContrasena(sesion.usuario)) {
    const contrasena = resultado.data.contrasena;
    if (!contrasena) return { errores: { contrasena: "Ingresá tu contraseña para confirmar." } };
    if (!sesion.usuario.email || !(await contrasenaCorrecta(sesion.usuario.email, contrasena))) {
      return { errores: { contrasena: "La contraseña no coincide." } };
    }
  } else if (!ingresoReciente(sesion.usuario)) {
    return {
      mensaje:
        "Por seguridad, volvé a ingresar con Google y después borrá tu cuenta. Tiene que ser un ingreso de los últimos minutos.",
    };
  }

  try {
    // La service role la crea borrado.ts (lista cerrada de AGENTS.md §5, LAB-57).
    await borrarCuentaDeUsuario(sesion.usuario.id);
  } catch {
    return {
      mensaje:
        "No pudimos borrar tu cuenta. No se perdió nada: probá de nuevo en unos minutos o escribinos a soporte.",
    };
  }

  try {
    await sesion.supabase.auth.signOut();
  } catch {
    // La cuenta ya no existe; las cookies vencen solas.
  }
  redirect("/cuenta-eliminada");
}
