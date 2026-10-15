import { z } from "zod";

export const MOTIVOS_REPORTE = [
  "datos_falsos",
  "comportamiento",
  "estafa",
  "contenido_inapropiado",
  "otro",
] as const;

export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

export const ETIQUETAS_MOTIVO: Record<MotivoReporte, string> = {
  datos_falsos: "Datos falsos o se hace pasar por otra persona",
  comportamiento: "Comportamiento inadecuado o inseguro",
  estafa: "Intento de estafa o pedido de pago por fuera",
  contenido_inapropiado: "Contenido inapropiado",
  otro: "Otro",
};

export const TIPOS_OBJETIVO = ["perfil", "trabajo", "resena"] as const;
export type TipoObjetivo = (typeof TIPOS_OBJETIVO)[number];

export const ETIQUETAS_OBJETIVO: Record<TipoObjetivo, string> = {
  perfil: "perfil",
  trabajo: "trabajo",
  resena: "reseña",
};

export const MAX_CARACTERES_DETALLE = 500;

export const esquemaReporte = z.object({
  objetivoTipo: z.enum(TIPOS_OBJETIVO, { message: "Tipo de objetivo no válido." }),
  objetivoId: z.string().uuid("Identificador de objetivo no válido."),
  motivo: z.enum(MOTIVOS_REPORTE, { message: "Elegí una opción para continuar." }),
  detalle: z
    .string()
    .trim()
    .max(
      MAX_CARACTERES_DETALLE,
      `El detalle no puede superar los ${MAX_CARACTERES_DETALLE} caracteres.`,
    )
    .optional()
    .default(""),
});

export type DatosReporte = z.infer<typeof esquemaReporte>;

export const esquemaMarcarEnRevision = z.object({
  reporteId: z.string().uuid("Identificador de reporte no válido."),
});

export const esquemaResolverReporte = z.object({
  reporteId: z.string().uuid("Identificador de reporte no válido."),
  resolucion: z.enum(["accion_tomada", "desestimado"], {
    message: "Resolución no válida.",
  }),
  motivo: z.string().trim().max(500, "El motivo no puede superar los 500 caracteres.").optional(),
});

export const esquemaOcultarResena = z.object({
  resenaId: z.string().uuid("Identificador de reseña no válido."),
  motivo: z.string().trim().max(500, "El motivo no puede superar los 500 caracteres.").optional(),
});

export const esquemaCerrarTrabajo = z.object({
  trabajoId: z.string().uuid("Identificador de trabajo no válido."),
  motivo: z.string().trim().max(500, "El motivo no puede superar los 500 caracteres.").optional(),
});

export const esquemaSuspenderCuenta = z.object({
  usuarioId: z.string().uuid("Identificador de usuario no válido."),
  motivo: z
    .string()
    .trim()
    .min(3, "El motivo debe tener al menos 3 caracteres.")
    .max(500, "El motivo no puede superar los 500 caracteres."),
});

export const esquemaReactivarCuenta = z.object({
  usuarioId: z.string().uuid("Identificador de usuario no válido."),
  motivo: z.string().trim().max(500, "El motivo no puede superar los 500 caracteres.").optional(),
});
