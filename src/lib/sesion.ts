import { cache } from "react";
import { connection } from "next/server";

import { VERSION_NORMAS } from "@/lib/normas";
import { rolFalso } from "@/lib/auth/sesion-falsa";
import type { RolUsuario } from "@/lib/auth/rutas";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

/** Roles con pantallas propias en `(app)`. El admin tiene su panel aparte. */
export type RolApp = "cliente" | "profesional";

export type SesionActual = {
  usuario: { id: string; email: string | null };
  rol: RolUsuario;
  /** Versión de las normas que aceptó (LAB-20), o `null` si todavía no aceptó. */
  normasVersion: string | null;
  /**
   * ¿Aceptó que es mayor de 18 y los términos? Lo guarda el servidor (`terminos_aceptados_at`).
   * Solo se exige a los clientes: ver `altaIncompleta`.
   */
  terminosAceptados: boolean;
  /** Barrio guardado en la cuenta (`usuarios.barrio_id`), o `null` si no eligió. */
  barrioId?: number | null;
  perfil: {
    nombre: string | null;
    apellido: string | null;
    /** Nombre para mostrar en la interfaz (nunca vacío). */
    nombreVisible: string;
    /** ¿Ya completó sus datos de registro? (hoy: tiene nombre). */
    completo: boolean;
  };
};

/** Nombre para mostrar: "Nombre Apellido", o lo que va antes de la @ del email, o "Tu cuenta". */
export function nombreVisible(
  nombre: string | null,
  apellido: string | null,
  email: string | null,
): string {
  const completo = [nombre, apellido].filter(Boolean).join(" ").trim();
  if (completo) return completo;
  const local = email?.split("@")[0]?.trim();
  return local || "Tu cuenta";
}

type ClienteServidor = Awaited<ReturnType<typeof crearClienteServidor>>;

/**
 * Rol de una cuenta leído con el cliente de la sesión (la RLS deja leer la fila propia). Sin fila
 * devuelve `cliente`. Único helper de rol para las Server Actions y las rutas que ya validaron la
 * sesión (LAB-47). Para Server Components usar `obtenerSesion`.
 */
export async function rolDeLaSesion(
  supabase: ClienteServidor,
  idUsuario: string,
): Promise<RolUsuario> {
  const { data } = await supabase.from("usuarios").select("rol").eq("id", idUsuario).maybeSingle();
  return data?.rol ?? "cliente";
}

/**
 * Cómo se comprueba quién es el usuario (LAB-88):
 * - `claims`: `getClaims()` verifica la firma del JWT en el servidor con la clave pública del
 *   proyecto (JWKS, cacheada en memoria): no hace una ida y vuelta a Auth. Alcanza para pintar
 *   pantallas. No ve una sesión revocada hasta que vence el token (1 h); la cuenta suspendida sí
 *   se detecta, porque el estado se lee de `usuarios` en cada pedido.
 * - `servidor`: `getUser()` valida el token contra Auth. Es para las Server Actions que mutan
 *   datos y para el panel admin.
 */
type Verificacion = "claims" | "servidor";

async function identidad(
  supabase: ClienteServidor,
  verificacion: Verificacion,
): Promise<{ id: string; email: string | null } | null> {
  if (verificacion === "servidor") {
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  }
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

async function construirSesion(verificacion: Verificacion): Promise<SesionActual | null> {
  // Se lee en cada pedido (no al compilar).
  await connection();

  const falso = rolFalso();
  if (falso) {
    return {
      usuario: {
        id: falso === "profesional" ? process.env.LABIA_ID_DEV || "demo" : "demo-cliente",
        email: null,
      },
      rol: falso,
      normasVersion: VERSION_NORMAS,
      terminosAceptados: true,
      barrioId: null,
      perfil: {
        nombre: falso === "profesional" ? "Martín" : "Laura",
        apellido: falso === "profesional" ? "Gómez" : "Fernández",
        nombreVisible: falso === "profesional" ? "Martín Gómez" : "Laura Fernández",
        completo: true,
      },
    };
  }

  if (!supabaseConfigurado()) return null;

  const supabase = await crearClienteServidor();
  const quien = await identidad(supabase, verificacion);
  if (!quien) return null;

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado, nombre, apellido, normas_version, terminos_aceptados_at, barrio_id")
    .eq("id", quien.id)
    .maybeSingle();
  // Sin fila o con la cuenta suspendida/baja: se trata como sin sesión. Esta es la segunda
  // barrera (la primera es `proxy.ts`): no depende de lo que diga el token.
  if (!fila || fila.estado !== "activa") return null;

  return {
    usuario: { id: quien.id, email: quien.email },
    rol: fila.rol,
    normasVersion: fila.normas_version,
    terminosAceptados: fila.terminos_aceptados_at !== null,
    barrioId: fila.barrio_id,
    perfil: {
      nombre: fila.nombre,
      apellido: fila.apellido,
      nombreVisible: nombreVisible(fila.nombre, fila.apellido, quien.email),
      completo: Boolean(fila.nombre),
    },
  };
}

/**
 * Sesión del pedido actual para Server Components: `{ usuario, rol, perfil }` o `null` si no hay
 * sesión. Se memoriza por pedido (`cache` de React): llamarla desde varios componentes cuesta una
 * sola consulta. Verifica el JWT con `getClaims` (sin ir a Auth) y lee `usuarios` una vez.
 * Para Server Actions y el panel admin usar `obtenerSesionVerificada`.
 */
export const obtenerSesion = cache(() => construirSesion("claims"));

/**
 * Igual que `obtenerSesion`, pero valida el token contra Supabase Auth (`getUser`). Es la que usan
 * las Server Actions que mutan datos y `/admin`: ahí se prefiere la comprobación más estricta.
 */
export const obtenerSesionVerificada = cache(() => construirSesion("servidor"));
