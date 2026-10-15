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
 * Sesión del pedido actual para Server Components: `{ usuario, rol, perfil }` o `null` si no hay
 * sesión. Se memoriza por pedido (`cache` de React): llamarla desde varios componentes cuesta una
 * sola consulta. Valida el token con Supabase Auth (`getUser`), no solo la cookie.
 */
export const obtenerSesion = cache(async (): Promise<SesionActual | null> => {
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
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, estado, nombre, apellido, normas_version")
    .eq("id", data.user.id)
    .maybeSingle();
  // Sin fila o con la cuenta suspendida/baja: se trata como sin sesión.
  if (!fila || fila.estado !== "activa") return null;

  const email = data.user.email ?? null;
  return {
    usuario: { id: data.user.id, email },
    rol: fila.rol,
    normasVersion: fila.normas_version,
    perfil: {
      nombre: fila.nombre,
      apellido: fila.apellido,
      nombreVisible: nombreVisible(fila.nombre, fila.apellido, email),
      completo: Boolean(fila.nombre),
    },
  };
});
