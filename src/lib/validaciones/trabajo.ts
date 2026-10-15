import { z } from "zod";

import { OFICIOS, type Oficio } from "@/lib/busqueda";
import { sinDatosDeContacto, tieneDatosDeContacto } from "@/lib/validaciones/contenido-publico";

export { tieneDatosDeContacto };

export const URGENCIAS = ["lo_antes_posible", "esta_semana", "sin_apuro"] as const;
export type UrgenciaTrabajo = (typeof URGENCIAS)[number];

export const ETIQUETA_URGENCIA: Record<UrgenciaTrabajo, string> = {
  lo_antes_posible: "Lo antes posible",
  esta_semana: "Esta semana",
  sin_apuro: "Sin apuro",
};

export const ETIQUETA_OFICIO: Record<Oficio, string> = {
  carpinteria: "Carpintería",
  plomeria: "Plomería",
  cerrajeria: "Cerrajería",
  gas: "Gas",
  pintura: "Pintura",
  mecanica: "Mecánica",
  electricidad: "Electricidad",
};

export const MAX_FOTOS = 4;
export const MAX_TRABAJOS_ABIERTOS = 5;
export const MENSAJE_CONTACTO =
  "No pongas tu teléfono acá: los profesionales te contactan por la app y vos elegís a quién escribirle.";
export const MENSAJE_LIMITE_ABIERTOS =
  "Ya tenés 5 trabajos abiertos. Cerrá alguno para publicar otro.";

const sinContacto = (valor: string) => sinDatosDeContacto(valor);

/** "$ 15.000" → 15000; vacío → undefined; otra cosa → NaN (falla la validación). */
function aPesos(valor: unknown): unknown {
  if (typeof valor !== "string") return valor;
  const limpio = valor.replace(/[\s$.]/g, "");
  if (limpio === "") return undefined;
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
}

export const esquemaTrabajo = z.object({
  oficio: z.enum(OFICIOS, { error: "Elegí el oficio que necesitás." }),
  titulo: z
    .string({ error: "Escribí un título." })
    .trim()
    .min(5, "El título tiene que tener al menos 5 caracteres.")
    .max(80, "El título puede tener hasta 80 caracteres.")
    .refine(sinContacto, MENSAJE_CONTACTO),
  descripcion: z
    .string({ error: "Contá qué pasa." })
    .trim()
    .min(20, "Contá un poco más: al menos 20 caracteres.")
    .max(1000, "La descripción puede tener hasta 1000 caracteres.")
    .refine(sinContacto, MENSAJE_CONTACTO),
  barrioId: z.coerce
    .number({ error: "Elegí tu barrio." })
    .int({ error: "Elegí tu barrio." })
    .min(1, "Elegí tu barrio."),
  urgencia: z.enum(URGENCIAS, { error: "Elegí para cuándo lo necesitás." }),
  presupuesto: z.preprocess(
    aPesos,
    z
      .number({ error: "Escribí el presupuesto solo con números." })
      .int("Escribí el presupuesto solo con números.")
      .min(0, "El presupuesto no puede ser negativo.")
      .max(100_000_000, "Ese presupuesto es demasiado alto.")
      .optional(),
  ),
  cantidadFotos: z.coerce
    .number()
    .int()
    .min(0)
    .max(MAX_FOTOS, "Podés subir hasta 4 fotos.")
    .default(0),
});

export type DatosTrabajo = z.output<typeof esquemaTrabajo>;

export function erroresDeTrabajo(error: z.ZodError): Partial<Record<string, string>> {
  const errores: Partial<Record<string, string>> = {};
  for (const problema of error.issues) {
    const clave = String(problema.path[0] ?? "");
    if (clave && !errores[clave]) errores[clave] = problema.message;
  }
  return errores;
}

export function esquemaFotos(trabajoId: string) {
  return z
    .array(
      z
        .string()
        .max(200)
        .refine(
          (ruta) =>
            ruta.startsWith(`trabajos/${trabajoId}/`) &&
            !ruta.includes("..") &&
            /\.(jpe?g|png|webp)$/.test(ruta),
          "Ruta de foto no válida.",
        ),
    )
    .max(MAX_FOTOS);
}

export const rutaTrabajoPublicado = (id: string) => `/mis-trabajos/${id}?publicado=1`;
