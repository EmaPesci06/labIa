import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "./supabase/tipos";

/** Cantidad de profesionales por página en la búsqueda. */
export const PROFESIONALES_POR_PAGINA = 20;

export const OFICIOS = [
  "carpinteria",
  "plomeria",
  "cerrajeria",
  "gas",
  "pintura",
  "mecanica",
  "electricidad",
] as const;

export type Oficio = (typeof OFICIOS)[number];

export const ORDENES = ["cercania", "calificacion"] as const;
export type OrdenBusqueda = (typeof ORDENES)[number];

type ValorUrl = string | string[] | undefined;

/** Un parámetro repetido en la URL (`?a=1&a=2`) se toma por su primer valor. */
const primero = (valor: unknown): unknown => (Array.isArray(valor) ? valor[0] : valor);

/** Vacío o ausente es "no vino"; para que `?oficio=` no sea un error. */
const sinVacios = (valor: unknown): unknown => {
  const v = primero(valor);
  return typeof v === "string" && v.trim() === "" ? undefined : v;
};

const BANDERA = ["1", "0", "true", "false"] as const;

/**
 * Parámetros de la URL de búsqueda:
 * `?oficio=gas&barrio=la-perla&matriculados=1&orden=calificacion&pagina=2`
 *
 * `barrio` es el slug del barrio de referencia y es obligatorio. Los filtros de sí/no aceptan
 * `1`/`true` y `0`/`false`; cualquier otro valor es un error, no se ignora en silencio.
 */
export const esquemaBusqueda = z.object({
  oficio: z.preprocess(sinVacios, z.enum(OFICIOS, { error: "Ese oficio no existe." }).optional()),
  barrio: z.preprocess(
    sinVacios,
    z
      .string({ error: "Elegí un barrio." })
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: "Ese barrio no es válido." })
      .max(80, { error: "Ese barrio no es válido." }),
  ),
  matriculados: z.preprocess(
    sinVacios,
    z
      .enum(BANDERA, { error: "El filtro de matriculados no es válido." })
      .optional()
      .transform((v) => v === "1" || v === "true"),
  ),
  orden: z.preprocess(
    sinVacios,
    z
      .enum(ORDENES, { error: "Ese orden no existe." })
      .optional()
      .transform((v): OrdenBusqueda => v ?? "cercania"),
  ),
  todaLaCiudad: z.preprocess(
    sinVacios,
    z
      .enum(BANDERA, { error: "El filtro de zona no es válido." })
      .optional()
      .transform((v) => v === "1" || v === "true"),
  ),
  pagina: z.preprocess(
    sinVacios,
    z.coerce
      .number({ error: "La página no es válida." })
      .int({ error: "La página no es válida." })
      .min(1, { error: "La página no es válida." })
      .max(1000, { error: "La página no es válida." })
      .default(1),
  ),
});

export type ParametrosBusqueda = z.output<typeof esquemaBusqueda>;

/** Un profesional en los resultados. Sin datos de contacto: el WhatsApp se pide aparte (LAB-25). */
export type ResultadoProfesional = {
  usuarioId: string;
  nombre: string;
  apellidoInicial: string;
  fotoPath: string | null;
  oficios: Oficio[];
  aniosExperiencia: number | null;
  zonasTexto: string;
  promedio: number | null;
  cantidadResenas: number;
  identidadVerificada: boolean;
  antecedentesOk: boolean;
  matriculado: boolean;
  distanciaKm: number;
};

export type PaginaResultados = {
  profesionales: ResultadoProfesional[];
  total: number;
  pagina: number;
  paginas: number;
};

/** Error con mensaje en castellano, listo para mostrar. `campos` trae el detalle por parámetro. */
export class ErrorBusqueda extends Error {
  constructor(
    mensaje: string,
    readonly campos: Partial<Record<keyof ParametrosBusqueda, string>> = {},
  ) {
    super(mensaje);
    this.name = "ErrorBusqueda";
  }
}

/** Valida los parámetros de la URL (o de un objeto `searchParams` de Next). Lanza `ErrorBusqueda`. */
export function leerParametrosBusqueda(
  entrada: URLSearchParams | Record<string, ValorUrl>,
): ParametrosBusqueda {
  const crudo: Record<string, ValorUrl> = {};
  if (entrada instanceof URLSearchParams) {
    for (const clave of new Set(entrada.keys())) crudo[clave] = entrada.getAll(clave);
  } else {
    Object.assign(crudo, entrada);
  }

  const resultado = esquemaBusqueda.safeParse({
    oficio: crudo.oficio,
    barrio: crudo.barrio,
    matriculados: crudo.matriculados,
    orden: crudo.orden,
    todaLaCiudad: crudo.toda_la_ciudad ?? crudo.todaLaCiudad,
    pagina: crudo.pagina,
  });
  if (resultado.success) return resultado.data;

  const campos: Partial<Record<keyof ParametrosBusqueda, string>> = {};
  for (const problema of resultado.error.issues) {
    const clave = problema.path[0] as keyof ParametrosBusqueda | undefined;
    if (clave && !campos[clave]) campos[clave] = problema.message;
  }
  const primerMensaje = Object.values(campos)[0] ?? "La búsqueda no es válida.";
  throw new ErrorBusqueda(primerMensaje, campos);
}

const MENSAJE_FALLA = "No pudimos buscar en este momento. Probá de nuevo.";

/**
 * Busca profesionales publicados con `public.buscar_profesionales` (LAB-22).
 *
 * Recibe el cliente de Supabase ya creado (el de servidor con la sesión del usuario, o uno anónimo):
 * la función es `security invoker`, así que RLS decide qué filas se ven. Los parámetros se validan
 * con Zod y el barrio se resuelve por `slug`.
 */
export async function buscarProfesionales(
  supabase: SupabaseClient<Database>,
  entrada: URLSearchParams | Record<string, ValorUrl>,
): Promise<PaginaResultados> {
  const params = leerParametrosBusqueda(entrada);

  const { data: barrio, error: errorBarrio } = await supabase
    .from("barrios")
    .select("id")
    .eq("slug", params.barrio)
    .maybeSingle();
  if (errorBarrio) throw new ErrorBusqueda(MENSAJE_FALLA);
  if (!barrio) {
    throw new ErrorBusqueda("Ese barrio no existe.", { barrio: "Ese barrio no existe." });
  }

  const { data, error } = await supabase.rpc("buscar_profesionales", {
    p_oficio: params.oficio,
    p_barrio: barrio.id,
    p_solo_matriculados: params.matriculados,
    p_orden: params.orden,
    p_toda_la_ciudad: params.todaLaCiudad,
    p_limite: PROFESIONALES_POR_PAGINA,
    p_desde: (params.pagina - 1) * PROFESIONALES_POR_PAGINA,
  });
  if (error) throw new ErrorBusqueda(MENSAJE_FALLA);

  const filas = data ?? [];
  // `total` es bigint: PostgREST lo manda como número, pero por las dudas se convierte.
  const total = Number(filas[0]?.total ?? 0);

  return {
    profesionales: filas.map((fila) => ({
      usuarioId: fila.usuario_id,
      nombre: fila.nombre,
      apellidoInicial: fila.apellido_inicial,
      fotoPath: fila.foto_path ?? null,
      oficios: fila.oficios,
      aniosExperiencia: fila.anios_experiencia ?? null,
      zonasTexto: fila.zonas_texto,
      promedio:
        fila.promedio === null || fila.promedio === undefined ? null : Number(fila.promedio),
      cantidadResenas: fila.cantidad_resenas,
      identidadVerificada: fila.identidad_verificada,
      antecedentesOk: fila.antecedentes_ok,
      matriculado: fila.matriculado,
      distanciaKm: Number(fila.distancia_km),
    })),
    total,
    pagina: params.pagina,
    paginas: Math.max(1, Math.ceil(total / PROFESIONALES_POR_PAGINA)),
  };
}
