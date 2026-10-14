import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { inicioDelRol, volverSeguro } from "@/lib/auth/rutas";
import { guardarDatosDeCliente } from "@/lib/auth/datos-de-cliente";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { urlDelSitio } from "@/lib/sitio";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { ROLES_REGISTRABLES, type RolRegistrable } from "@/lib/validaciones/auth";
import { esquemaCompletarCliente } from "@/lib/validaciones/registro-cliente";

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

  // El trigger de alta solo lee el rol del signUp con email; con Google la cuenta nace como
  // cliente. La función valida en la base (cuenta nueva, sin datos, nunca admin).
  if (rolElegido === "profesional") {
    // 42501: la cuenta ya tiene datos y conserva su rol (caso normal al volver a ingresar).
    // Cualquier otro error es un fallo real: se avisa en vez de mostrar el formulario equivocado.
    const { error } = await supabase.rpc("elegir_rol_inicial", { p_rol: "profesional" });
    if (error && error.code !== "42501") return aIngresar("rol");
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

  // Cliente que confirmó el email: el registro guardó WhatsApp y barrio en la metadata del
  // usuario porque todavía no había sesión. Se aplican acá (LAB-17); se validan de nuevo.
  if (fila && !fila.whatsapp && fila.rol === "cliente") {
    const datos = esquemaCompletarCliente.safeParse({
      whatsapp: String(usuario.user_metadata?.whatsapp ?? ""),
      barrio: String(usuario.user_metadata?.barrio_id ?? ""),
    });
    if (datos.success) {
      const guardado = await guardarDatosDeCliente(supabase, usuario.id, {
        whatsapp: datos.data.whatsapp,
        barrioId: datos.data.barrio,
      });
      if (guardado) {
        await registrarEventoServidor(usuario.id, "registro_completado", { rol: "cliente" });
        return NextResponse.redirect(`${base}${inicioDelRol("cliente")}`);
      }
    }
  }

  // Sin WhatsApp todavía no completó el registro: el profesional sigue en su formulario y el
  // cliente (Google, o datos que no se pudieron aplicar) va a "un último paso".
  if (!fila?.whatsapp) {
    const camino = rolElegido ?? (fila?.rol === "profesional" ? "profesional" : "cliente");
    return NextResponse.redirect(
      `${base}/registro/${camino}${camino === "cliente" ? "/completar" : ""}`,
    );
  }

  return NextResponse.redirect(
    `${base}${volverSeguro(searchParams.get("volver")) ?? inicioDelRol(fila.rol)}`,
  );
}
