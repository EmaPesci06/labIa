import { z } from "zod";

/** Interruptores de `/cuenta/emails`. Un checkbox desmarcado no viaja en el formulario. */
export const esquemaPreferenciasEmail = z.object({
  trabajos_cerca: z.boolean(),
  novedades: z.boolean(),
});

export type PreferenciasEmail = z.infer<typeof esquemaPreferenciasEmail>;

/** Lee los dos interruptores del `FormData` (marcado = "on"). */
export function preferenciasDeFormulario(datos: FormData): PreferenciasEmail {
  return esquemaPreferenciasEmail.parse({
    trabajos_cerca: datos.get("trabajos_cerca") === "on",
    novedades: datos.get("novedades") === "on",
  });
}
