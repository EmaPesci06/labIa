"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { EstadoFormulario } from "@/lib/auth/estado";
import { registrarEventoServidor } from "@/lib/metricas-servidor";
import { VERSION_NORMAS } from "@/lib/normas";
import { limitarIntentos } from "@/lib/rate-limit";
import { cargarDatosRegistro } from "@/lib/registro/borrador";
import { faltantesRegistrados } from "@/lib/registro/documentos-estado";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { esquemaAceptarNormas, leerAceptacionNormas } from "@/lib/validaciones/normas";

const MENSAJE_DOCUMENTOS_NORMAS =
  "Te faltan documentos de verificación. Subilos antes de aceptar las normas.";

// Paso 2 del registro de profesional (LAB-20) y re-aceptación cuando cambia la versión.

const REGLA = { maximo: 10, ventanaMs: 60_000 } as const;

/**
 * Registra que el profesional aceptó las normas vigentes (RPC `aceptar_normas`: la versión y la
 * fecha no se pueden escribir directo). Valida entrada, sesión y rol. La primera vez sigue a la
 * pantalla de "listo" y emite `registro_completado`; si ya había aceptado una versión anterior,
 * vuelve a sus trabajos.
 */
export async function aceptarNormas(
  _anterior: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaAceptarNormas.safeParse(leerAceptacionNormas(datos));
  if (!resultado.success) {
    return { mensaje: resultado.error.issues[0]?.message ?? "Revisá los datos." };
  }

  if (!supabaseConfigurado()) {
    return { mensaje: "El registro todavía no está disponible. Probá de nuevo más tarde." };
  }
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { mensaje: "Tu sesión venció. Ingresá de nuevo." };

  const encabezados = await headers();
  const ip =
    encabezados.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    encabezados.get("x-real-ip") ||
    "desconocida";
  const limite = limitarIntentos(`normas:${auth.user.id}:${ip}`, REGLA);
  if (!limite.permitido) {
    return {
      mensaje: `Hiciste demasiados intentos. Esperá ${limite.segundosParaReintentar} segundos y probá de nuevo.`,
    };
  }

  const { data: fila } = await supabase
    .from("usuarios")
    .select("rol, normas_version")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (fila?.rol !== "profesional") return { mensaje: "Esta cuenta no es de profesional." };

  // El chequeo de la página no alcanza: la acción lo repite con lo que hay en la base (LAB-43).
  const { verificaciones, borrador } = await cargarDatosRegistro();
  if (faltantesRegistrados(verificaciones, borrador.oficios.includes("gas")).length > 0) {
    return { mensaje: MENSAJE_DOCUMENTOS_NORMAS };
  }

  const { error } = await supabase.rpc("aceptar_normas", { p_version: VERSION_NORMAS });
  if (error) return { mensaje: "No pudimos guardar tu aceptación. Probá de nuevo en un momento." };

  if (fila.normas_version) redirect("/trabajos");
  await registrarEventoServidor(auth.user.id, "registro_completado", { rol: "profesional" });
  redirect("/registro/profesional/listo");
}
