import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { inicioDelRol, volverSeguro } from "@/lib/auth/rutas";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { ROLES_REGISTRABLES, type RolRegistrable } from "@/lib/validaciones/auth";

const TIPOS_OTP: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

const rolRegistrable = (valor: unknown): RolRegistrable | null =>
  ROLES_REGISTRABLES.find((rol) => rol === valor) ?? null;

/**
 * Vuelta de Google (OAuth), de los links mágicos y de los enlaces de confirmación y
 * recuperación del email (LAB-16). Cambia el código por una sesión y decide a dónde seguir:
 *
 * - `siguiente` (ruta interna): se respeta tal cual, por ejemplo `/restablecer`.
 * - Cuenta nueva o sin datos completos: al registro del camino elegido (`rol`).
 * - Si no: a `volver` o al inicio del rol.
 *
 * `rol` es un dato del navegador: solo sirve para elegir qué formulario de registro mostrar y se
 * guarda en `user_metadata.rol`. El rol real vive en `public.usuarios` y `admin` nunca sale de acá.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = urlDelSitio();
  const aIngresar = (error: string) => NextResponse.redirect(`${base}/ingresar?error=${error}`);

  if (!supabaseConfigurado()) return aIngresar("config");
  if (searchParams.get("error") || searchParams.get("error_description")) {
    return aIngresar("cancelado");
  }

  const supabase = await crearClienteServidor();
  const codigo = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = TIPOS_OTP.find((t) => t === searchParams.get("type"));

  if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) return aIngresar("enlace");
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (error) return aIngresar("enlace");
  } else {
    return aIngresar("enlace");
  }

  const { data: auth } = await supabase.auth.getUser();
  const usuario = auth.user;
  if (!usuario) return aIngresar("enlace");

  const siguiente = volverSeguro(searchParams.get("siguiente"));
  if (siguiente) return NextResponse.redirect(`${base}${siguiente}`);

  const rolElegido =
    rolRegistrable(searchParams.get("rol")) ?? rolRegistrable(usuario.user_metadata?.rol);

  // Guarda el camino elegido en el usuario (una sola vez) para retomarlo si abandona el registro.
  if (rolElegido && !rolRegistrable(usuario.user_metadata?.rol)) {
    await supabase.auth.updateUser({ data: { rol: rolElegido } });
  }

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, nombre, apellido, whatsapp")
    .eq("id", usuario.id)
    .maybeSingle();

  // Google entrega el nombre en `given_name` / `family_name`; el trigger solo lee `nombre`.
  // `nombre` y `apellido` sí los puede editar el usuario (RLS y grants de LAB-12).
  if (fila && !fila.nombre) {
    const meta = usuario.user_metadata ?? {};
    const nombre = String(meta.given_name ?? meta.name ?? meta.full_name ?? "")
      .trim()
      .slice(0, 60);
    const apellido = String(meta.family_name ?? "")
      .trim()
      .slice(0, 60);
    if (nombre) {
      await supabase
        .from("usuarios")
        .update({ nombre, apellido: apellido || null })
        .eq("id", usuario.id);
    }
  }

  // Sin WhatsApp todavía no completó el registro (los formularios completos son LAB-17 / LAB-18).
  if (!fila?.whatsapp) {
    const camino = rolElegido ?? (fila?.rol === "profesional" ? "profesional" : "cliente");
    return NextResponse.redirect(`${base}/registro/${camino}`);
  }

  return NextResponse.redirect(
    `${base}${volverSeguro(searchParams.get("volver")) ?? inicioDelRol(fila.rol)}`,
  );
}
