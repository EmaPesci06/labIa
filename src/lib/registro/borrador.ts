import "server-only";

import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

import {
  BORRADOR_VACIO,
  type BarrioOpcion,
  type BorradorPerfil,
  type SesionRegistro,
} from "./tipos";

export type DatosRegistro = {
  sesion: SesionRegistro;
  /** Rol de la cuenta con sesión; `null` sin sesión. */
  rol: "cliente" | "profesional" | "admin" | null;
  borrador: BorradorPerfil;
  barrios: BarrioOpcion[];
  /** URLs públicas de las fotos ya subidas, por ruta. */
  urls: Record<string, string>;
};

const comoTexto = (valor: unknown): string => (typeof valor === "string" ? valor : "");
const comoLista = (valor: unknown): string[] =>
  Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
const comoIds = (valor: unknown): number[] =>
  Array.isArray(valor) ? valor.filter((v): v is number => Number.isInteger(v)) : [];

/** Lee el borrador guardado en `user_metadata` al crear la cuenta (antes de confirmar el email). */
function borradorDeMetadata(meta: unknown): Partial<BorradorPerfil> {
  if (!meta || typeof meta !== "object") return {};
  const origen = meta as Record<string, unknown>;
  return {
    nombreCompleto: comoTexto(origen.nombreCompleto),
    whatsapp: comoTexto(origen.whatsapp),
    barrioId: comoTexto(origen.barrioId),
    oficios: comoLista(origen.oficios),
    especialidades: comoTexto(origen.especialidades),
    todaLaCiudad: origen.todaLaCiudad === true,
    zonas: comoIds(origen.zonas),
    aniosExperiencia: comoTexto(origen.aniosExperiencia),
    matricula: comoTexto(origen.matricula),
    descripcion: comoTexto(origen.descripcion),
    disponibilidad: comoTexto(origen.disponibilidad),
  };
}

/** Quita los ceros de relleno que Postgres devuelve en el E.164 mostrado ("+549223…" → "223…"). */
function whatsappParaMostrar(e164: string | null): string {
  if (!e164) return "";
  const digitos = e164.replace(/^\+549/, "");
  return digitos.length === 10 ? `${digitos.slice(0, 3)} ${digitos.slice(3)}` : e164;
}

/**
 * Todo lo que necesita la pantalla del paso 1: la sesión, los barrios y lo que la persona ya
 * guardó (para que al volver el formulario aparezca rellenado). Sin Supabase devuelve un
 * formulario vacío.
 */
export async function cargarDatosRegistro(): Promise<DatosRegistro> {
  const vacio: DatosRegistro = {
    sesion: null,
    rol: null,
    borrador: BORRADOR_VACIO,
    barrios: [],
    urls: {},
  };
  if (!supabaseConfigurado()) return vacio;

  const supabase = await crearClienteServidor();
  const [{ data: auth }, { data: barrios }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("barrios").select("id, nombre").order("nombre"),
  ]);
  const opciones: BarrioOpcion[] = barrios ?? [];
  const usuario = auth.user;
  if (!usuario) return { ...vacio, barrios: opciones };

  const sesion = { uid: usuario.id, email: usuario.email ?? null };
  const [{ data: fila }, { data: perfil }, { data: matricula }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("rol, nombre, apellido, whatsapp, barrio_id, foto_path")
      .eq("id", usuario.id)
      .maybeSingle(),
    supabase
      .from("perfiles_profesionales")
      .select(
        "oficios, especialidades, descripcion, anios_experiencia, toda_la_ciudad, zonas, disponibilidad, fotos_trabajos",
      )
      .eq("usuario_id", usuario.id)
      .maybeSingle(),
    supabase
      .from("matricula_propia")
      .select("matricula_numero")
      .eq("usuario_id", usuario.id)
      .maybeSingle(),
  ]);

  const meta = borradorDeMetadata(usuario.user_metadata?.perfil_borrador);
  const nombreGuardado = [fila?.nombre, fila?.apellido].filter(Boolean).join(" ");
  const borrador: BorradorPerfil = {
    ...BORRADOR_VACIO,
    ...meta,
    // Lo guardado en la base pisa al borrador.
    ...(nombreGuardado ? { nombreCompleto: nombreGuardado } : {}),
    ...(fila?.whatsapp ? { whatsapp: whatsappParaMostrar(fila.whatsapp) } : {}),
    ...(fila?.barrio_id ? { barrioId: String(fila.barrio_id) } : {}),
    fotoPerfil: fila?.foto_path ?? "",
    ...(perfil
      ? {
          oficios: perfil.oficios,
          especialidades: perfil.especialidades ?? "",
          descripcion: perfil.descripcion ?? "",
          aniosExperiencia:
            perfil.anios_experiencia === null ? "" : String(perfil.anios_experiencia),
          todaLaCiudad: perfil.toda_la_ciudad,
          zonas: perfil.zonas,
          disponibilidad: perfil.disponibilidad ?? "",
          fotosTrabajos: perfil.fotos_trabajos,
          matricula: matricula?.matricula_numero ?? "",
        }
      : {}),
  };

  const rutas = [borrador.fotoPerfil, ...borrador.fotosTrabajos].filter(Boolean);
  const urls = Object.fromEntries(
    rutas.map((ruta) => [ruta, supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl]),
  );

  return { sesion, rol: fila?.rol ?? null, borrador, barrios: opciones, urls };
}
