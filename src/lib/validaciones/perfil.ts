import { z } from "zod";

import { OFICIOS } from "@/lib/busqueda";
import { textoLibrePublico } from "@/lib/validaciones/contenido-publico";

/** Edición del perfil profesional (`/cuenta/perfil`). Los errores van al lado de cada campo. */
export const esquemaPerfilProfesional = z
  .object({
    oficios: z
      .array(z.enum(OFICIOS, { error: "Ese oficio no existe." }))
      .min(1, "Elegí al menos un oficio.")
      .max(OFICIOS.length, "Elegiste demasiados oficios."),
    especialidades: textoLibrePublico(120, "Las especialidades pueden tener hasta 120 caracteres."),
    descripcion: textoLibrePublico(500, "La descripción puede tener hasta 500 caracteres."),
    aniosExperiencia: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .pipe(
        z
          .number({ error: "Ingresá los años como un número." })
          .int("Ingresá los años como un número entero.")
          .min(0, "Los años no pueden ser negativos.")
          .max(70, "Los años de experiencia pueden ser hasta 70.")
          .nullable(),
      ),
    disponibilidad: textoLibrePublico(120, "La disponibilidad puede tener hasta 120 caracteres."),
    todaLaCiudad: z.boolean(),
    zonas: z
      .array(z.number().int().positive("Esa zona no es válida."))
      .max(10, "Podés elegir hasta 10 zonas."),
  })
  .refine((d) => d.todaLaCiudad || d.zonas.length >= 1, {
    path: ["zonas"],
    error: "Elegí al menos una zona o marcá que trabajás en toda la ciudad.",
  });

export type DatosPerfilProfesional = z.output<typeof esquemaPerfilProfesional>;

/** Pasa un `FormData` al objeto que espera el esquema (checkbox → booleano, listas con `getAll`). */
export function datosDeFormularioPerfil(datos: FormData) {
  const texto = (clave: string) => {
    const valor = datos.get(clave);
    return typeof valor === "string" ? valor : "";
  };
  return {
    oficios: datos.getAll("oficios").map(String),
    especialidades: texto("especialidades"),
    descripcion: texto("descripcion"),
    aniosExperiencia: texto("aniosExperiencia"),
    disponibilidad: texto("disponibilidad"),
    todaLaCiudad: datos.get("todaLaCiudad") === "on",
    zonas: datos
      .getAll("zonas")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n)),
  };
}
