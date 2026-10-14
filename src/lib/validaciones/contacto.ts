import { z } from "zod";

/** Desde dónde se abre el WhatsApp: el perfil (LAB-25) o una postulación (tarea de elegir postulante). */
export const ORIGENES_CONTACTO = ["perfil", "postulacion"] as const;

/**
 * Pedido de contacto por WhatsApp. Lo usan la hoja "Antes de contactar" y la Server Action, así que
 * las dos reglas (origen y trabajo) se validan igual en el navegador y en el servidor.
 */
export const esquemaContacto = z
  .object({
    profesionalId: z.uuid({ error: "Ese perfil no existe." }),
    origen: z.enum(ORIGENES_CONTACTO, { error: "Ese origen de contacto no existe." }),
    trabajoId: z.uuid({ error: "Ese trabajo no existe." }).optional(),
  })
  .superRefine((datos, ctx) => {
    if (datos.origen === "postulacion" && !datos.trabajoId) {
      ctx.addIssue({
        code: "custom",
        path: ["trabajoId"],
        message: "Falta el trabajo de la postulación.",
      });
    }
    if (datos.origen === "perfil" && datos.trabajoId) {
      ctx.addIssue({
        code: "custom",
        path: ["trabajoId"],
        message: "Un contacto desde el perfil no lleva trabajo.",
      });
    }
  });

export type PedidoContacto = z.infer<typeof esquemaContacto>;

const texto = (valor: FormDataEntryValue | null): string | undefined =>
  typeof valor === "string" && valor !== "" ? valor : undefined;

/** Convierte el FormData de la hoja en el objeto que valida `esquemaContacto`. */
export function datosDeFormularioContacto(datos: FormData): Record<string, string | undefined> {
  return {
    profesionalId: texto(datos.get("profesionalId")),
    origen: texto(datos.get("origen")),
    trabajoId: texto(datos.get("trabajoId")),
  };
}
