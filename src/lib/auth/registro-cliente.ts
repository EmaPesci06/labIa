"use server";

import { redirect } from "next/navigation";

import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { limitarPersistente, limitarPorIp, mensajeDeLimite } from "@/lib/rate-limit-persistente";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import {
  esquemaCompletarCliente,
  esquemaRegistroCliente,
  esquemaReenviar,
  separarNombre,
} from "@/lib/validaciones/registro-cliente";

import { guardarDatosDeCliente } from "./datos-de-cliente";
import type { EstadoFormulario } from "./estado";

/** Estado de los formularios del registro de cliente (suma lo propio al estado común). */
export type EstadoRegistroCliente = EstadoFormulario & {
  /** Ya había una cuenta con ese email: se ofrece ingresar. */
  emailExistente?: boolean;
  /** Hay que confirmar el email: pantalla "Te mandamos un mail a …". */
  confirmarEmail?: string;
  /** Resultado del reenvío del mail de confirmación. */
  reenvio?: "enviado" | "demasiado-pronto" | "error";
};

const REGLA_REGISTRO = { maximo: 5, ventanaMs: 60_000 } as const;
const MENSAJE_SIN_SUPABASE = "El registro todavía no está disponible. Probá de nuevo más tarde.";
const MENSAJE_ERROR_GENERAL = "No pudimos completar el registro. Probá de nuevo en unos minutos.";

const texto = (datos: FormData, clave: string): string => {
  const valor = datos.get(clave);
  return typeof valor === "string" ? valor : "";
};

/** Máximo 5 intentos por minuto por IP y tipo de acción (Guía §7.7), compartido entre instancias. */
async function mensajeSiSuperaElLimite(accion: string): Promise<string | null> {
  return mensajeDeLimite(await limitarPorIp(accion, REGLA_REGISTRO));
}

function mensajeDeAuth(codigo: string | undefined, estado: number | undefined): string {
  switch (codigo) {
    case "weak_password":
      return "La contraseña es muy fácil de adivinar. Probá con otra más larga.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.";
    default:
      return estado === 400 || estado === 422
        ? "Revisá los datos e intentá de nuevo."
        : MENSAJE_ERROR_GENERAL;
  }
}

/**
 * Registro de cliente con email. `signUp` crea la cuenta con rol `cliente` (el trigger arma la
 * fila de `usuarios`). Si Supabase devuelve sesión, se guardan WhatsApp y barrio en el momento;
 * si pide confirmar el email, esos datos viajan en la metadata del usuario y el callback los
 * aplica cuando toca el enlace.
 */
export async function registrarCliente(
  _anterior: EstadoRegistroCliente,
  datos: FormData,
): Promise<EstadoRegistroCliente> {
  const entrada = {
    nombreCompleto: texto(datos, "nombreCompleto"),
    whatsapp: texto(datos, "whatsapp"),
    email: texto(datos, "email"),
    contrasena: texto(datos, "contrasena"),
    barrio: texto(datos, "barrio"),
  };
  // Nunca se devuelve la contraseña.
  const valores = {
    nombreCompleto: entrada.nombreCompleto,
    whatsapp: entrada.whatsapp,
    email: entrada.email,
    barrio: entrada.barrio,
  };

  const resultado = esquemaRegistroCliente.safeParse(entrada);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores };

  const limite = await mensajeSiSuperaElLimite("registro");
  if (limite) return { mensaje: limite, valores };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE, valores };
  const supabase = await crearClienteServidor();
  const { nombreCompleto, whatsapp, email, contrasena, barrio } = resultado.data;
  const { nombre, apellido } = separarNombre(nombreCompleto);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: contrasena,
    options: {
      // El trigger `al_crear_usuario` toma rol, nombre y apellido; solo acepta cliente/profesional.
      // whatsapp y barrio_id esperan acá hasta que haya sesión (confirmación de email).
      data: { rol: "cliente", nombre, apellido, whatsapp, barrio_id: barrio },
      emailRedirectTo: `${urlDelSitio()}/api/auth/callback?rol=cliente`,
    },
  });

  const yaExiste =
    error?.code === "user_already_exists" ||
    error?.code === "email_exists" ||
    // Con confirmación de email activada, Supabase no revela el duplicado: devuelve un usuario sin identidades.
    (!error && data.user !== null && data.user.identities?.length === 0);
  if (yaExiste) return { emailExistente: true, valores };
  if (error) return { mensaje: mensajeDeAuth(error.code, error.status), valores };

  const usuario = data.user;
  if (!data.session || !usuario) return { confirmarEmail: email, valores: { email } };

  const guardado = await guardarDatosDeCliente(supabase, usuario.id, {
    whatsapp,
    barrioId: barrio,
  });
  if (!guardado) {
    // La cuenta ya existe: se termina en el paso de completar datos.
    redirect("/registro/cliente/completar?aviso=datos");
  }

  await registrarEventoServidor(usuario.id, "registro_completado", { rol: "cliente" });
  redirect("/inicio");
}

/** Cliente con sesión (Google o email confirmado) al que le faltan WhatsApp y barrio. */
export async function completarRegistroCliente(
  _anterior: EstadoRegistroCliente,
  datos: FormData,
): Promise<EstadoRegistroCliente> {
  const entrada = { whatsapp: texto(datos, "whatsapp"), barrio: texto(datos, "barrio") };
  const resultado = esquemaCompletarCliente.safeParse(entrada);
  if (!resultado.success) return { errores: erroresPorCampo(resultado.error), valores: entrada };

  if (!supabaseConfigurado()) return { mensaje: MENSAJE_SIN_SUPABASE, valores: entrada };
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/ingresar?volver=%2Fregistro%2Fcliente%2Fcompletar");

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (!fila || fila.estado !== "activa" || fila.rol !== "cliente") {
    return { mensaje: "Esta pantalla es solo para cuentas de cliente.", valores: entrada };
  }

  const limite = await mensajeSiSuperaElLimite("completar-registro");
  if (limite) return { mensaje: limite, valores: entrada };

  const guardado = await guardarDatosDeCliente(supabase, auth.user.id, {
    whatsapp: resultado.data.whatsapp,
    barrioId: resultado.data.barrio,
  });
  if (!guardado) return { mensaje: MENSAJE_ERROR_GENERAL, valores: entrada };

  await registrarEventoServidor(auth.user.id, "registro_completado", { rol: "cliente" });
  redirect("/inicio");
}

/** Reenvía el mail de confirmación: como máximo 1 cada 60 segundos por email. */
export async function reenviarConfirmacion(
  _anterior: EstadoRegistroCliente,
  datos: FormData,
): Promise<EstadoRegistroCliente> {
  const resultado = esquemaReenviar.safeParse({ email: texto(datos, "email") });
  if (!resultado.success) return { reenvio: "error" };
  const { email } = resultado.data;

  const porEmail = await limitarPersistente(`reenvio:${email}`, { maximo: 1, ventanaMs: 60_000 });
  const porIp = await limitarPorIp("reenvio-ip", REGLA_REGISTRO);
  if (!porEmail.permitido || !porIp.permitido) {
    return { reenvio: "demasiado-pronto", confirmarEmail: email };
  }

  if (!supabaseConfigurado()) return { reenvio: "error", confirmarEmail: email };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${urlDelSitio()}/api/auth/callback?rol=cliente` },
  });
  return { reenvio: error ? "error" : "enviado", confirmarEmail: email };
}
