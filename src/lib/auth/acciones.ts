"use server";

import { redirect } from "next/navigation";

import { cupoIngresoAgotado, registrarFalloDeIngreso } from "@/lib/limites";
import { limitarPorIp, mensajeDeLimite } from "@/lib/rate-limit-persistente";
import { rolDeLaSesion } from "@/lib/sesion";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import {
  erroresPorCampo,
  esquemaGoogle,
  esquemaIngreso,
  esquemaNuevaContrasena,
  esquemaPedirRestablecer,
  esquemaRegistro,
} from "@/lib/validaciones/auth";

import type { EstadoFormulario } from "./estado";
import { inicioDelRol, volverSeguro } from "./rutas";

const REGLA_INGRESO = { maximo: 5, ventanaMs: 60_000 } as const;

const MENSAJE_SIN_SUPABASE = "El ingreso todavía no está disponible. Probá de nuevo más tarde.";
const MENSAJE_ERROR_GENERAL = "No pudimos completar la operación. Probá de nuevo en unos minutos.";

/** Máximo 5 intentos por minuto por IP y tipo de acción (Guía §7.7), compartido entre instancias. */
async function superaElLimite(accion: string): Promise<EstadoFormulario | null> {
  const mensaje = mensajeDeLimite(await limitarPorIp(accion, REGLA_INGRESO));
  return mensaje ? { mensaje } : null;
}

const texto = (datos: FormData, clave: string): string => {
  const valor = datos.get(clave);
  return typeof valor === "string" ? valor : "";
};

/** Traduce los errores de Supabase Auth a mensajes en castellano. */
function mensajeDeAuth(codigo: string | undefined, estado: number | undefined): string {
  switch (codigo) {
    case "invalid_credentials":
      return "El email o la contraseña no coinciden.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu correo y tocá el enlace.";
    case "user_already_exists":
    case "email_exists":
      return "Ya hay una cuenta con ese email. Ingresá o recuperá tu contraseña.";
    case "weak_password":
      return "La contraseña es muy fácil de adivinar. Probá con otra más larga.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.";
    case "same_password":
      return "La nueva contraseña tiene que ser distinta de la anterior.";
    default:
      return estado === 400 || estado === 422
        ? "Revisá los datos e intentá de nuevo."
        : MENSAJE_ERROR_GENERAL;
  }
}

export async function ingresar(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const entrada = {
    email: texto(datos, "email"),
    contrasena: texto(datos, "contrasena"),
    volver: texto(datos, "volver") || undefined,
  };
  const valores = { email: entrada.email };

  const resultado = esquemaIngreso.safeParse(entrada);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const bloqueado = await superaElLimite("ingreso");
  if (bloqueado) return { ...bloqueado, valores };

  // Tope de fallos (B-11, LAB-54): se consulta sin consumir antes de atender la contraseña. Si está
  // agotado, no se intenta el ingreso, aunque la clave sea correcta.
  const agotado = mensajeDeLimite(await cupoIngresoAgotado(resultado.data.email));
  if (agotado) return { mensaje: agotado, valores };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE, valores };
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.contrasena,
  });
  if (error || !data.user) {
    // Solo los fallos consumen cupo por cuenta (B-11): el ingreso correcto no consume nada.
    const bloqueoPorCuenta = mensajeDeLimite(await registrarFalloDeIngreso(resultado.data.email));
    if (bloqueoPorCuenta) return { mensaje: bloqueoPorCuenta, valores };
    return { mensaje: mensajeDeAuth(error?.code, error?.status), valores };
  }

  const rol = await rolDeLaSesion(supabase, data.user.id);
  redirect(volverSeguro(resultado.data.volver) ?? inicioDelRol(rol));
}

export async function registrar(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const entrada = {
    rol: texto(datos, "rol"),
    nombre: texto(datos, "nombre"),
    email: texto(datos, "email"),
    contrasena: texto(datos, "contrasena"),
  };
  const valores = { nombre: entrada.nombre, email: entrada.email };

  // El rol sale de un enum que no incluye "admin": un valor forzado en el formulario se rechaza.
  const resultado = esquemaRegistro.safeParse(entrada);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const bloqueado = await superaElLimite("registro");
  if (bloqueado) return { ...bloqueado, valores };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE, valores };
  const supabase = await crearClienteServidor();
  const { rol, nombre, email, contrasena } = resultado.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: contrasena,
    options: {
      // El trigger `al_crear_usuario` toma rol y nombre de acá y solo acepta cliente/profesional.
      data: { rol, nombre },
      emailRedirectTo: `${urlDelSitio()}/api/auth/callback?rol=${rol}`,
    },
  });
  if (error) return { mensaje: mensajeDeAuth(error.code, error.status), valores };

  // Con confirmación de email activada no hay sesión hasta que toque el enlace.
  if (!data.session) {
    return {
      exito:
        "Te enviamos un email para confirmar tu cuenta. Revisá tu correo y tocá el enlace para entrar.",
      valores: { email },
    };
  }
  redirect(inicioDelRol(rol));
}

export async function continuarConGoogle(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaGoogle.safeParse({
    rol: texto(datos, "rol") || undefined,
    volver: texto(datos, "volver") || undefined,
  });
  if (!resultado.success) return { mensaje: "Elegí cómo querés usar LabÍA antes de continuar." };

  const bloqueado = await superaElLimite("google");
  if (bloqueado) return bloqueado;

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE };
  const supabase = await crearClienteServidor();

  // El camino elegido (rol) y a dónde volver viajan en la URL del callback.
  const parametros = new URLSearchParams();
  if (resultado.data.rol) parametros.set("rol", resultado.data.rol);
  const volver = volverSeguro(resultado.data.volver);
  if (volver) parametros.set("volver", volver);
  const consulta = parametros.size ? `?${parametros.toString()}` : "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${urlDelSitio()}/api/auth/callback${consulta}` },
  });
  if (error || !data.url) {
    return { mensaje: "No pudimos conectar con Google. Probá con tu email y contraseña." };
  }
  redirect(data.url);
}

export async function salir(): Promise<void> {
  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function pedirRestablecer(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const entrada = { email: texto(datos, "email") };
  const resultado = esquemaPedirRestablecer.safeParse(entrada);
  if (!resultado.success) {
    return { errores: erroresPorCampo(resultado.error), valores: entrada };
  }

  const bloqueado = await superaElLimite("restablecer");
  if (bloqueado) return { ...bloqueado, valores: entrada };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE, valores: entrada };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(resultado.data.email, {
    redirectTo: `${urlDelSitio()}/api/auth/callback?siguiente=${encodeURIComponent("/restablecer")}`,
  });
  if (error && error.code === "over_email_send_rate_limit") {
    return { mensaje: mensajeDeAuth(error.code, error.status), valores: entrada };
  }
  // Misma respuesta exista o no la cuenta: no se revela qué emails están registrados.
  return {
    exito:
      "Si hay una cuenta con ese email, te enviamos un enlace para elegir una contraseña nueva.",
    valores: { email: resultado.data.email },
  };
}

export async function guardarNuevaContrasena(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaNuevaContrasena.safeParse({
    contrasena: texto(datos, "contrasena"),
    repetir: texto(datos, "repetir"),
  });
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error) };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE };
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { mensaje: "El enlace venció. Pedí uno nuevo para cambiar tu contraseña." };
  }
  const { error } = await supabase.auth.updateUser({ password: resultado.data.contrasena });
  if (error) return { mensaje: mensajeDeAuth(error.code, error.status) };

  redirect(inicioDelRol(await rolDeLaSesion(supabase, auth.user.id)));
}
