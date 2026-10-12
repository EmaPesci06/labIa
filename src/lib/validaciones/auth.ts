import { z } from "zod";

/** Roles que se pueden elegir al registrarse. `admin` NO está: se asigna a mano (Guía §7). */
export const ROLES_REGISTRABLES = ["cliente", "profesional"] as const;
export type RolRegistrable = (typeof ROLES_REGISTRABLES)[number];

const email = z
  .string({ error: "Ingresá tu email." })
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu email.")
  .max(254, "El email es demasiado largo.")
  .pipe(z.email({ error: "Revisá el email: parece que le falta algo." }));

const contrasenaNueva = z
  .string({ error: "Elegí una contraseña." })
  .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
  .max(72, "La contraseña puede tener hasta 72 caracteres.");

const rolRegistrable = z.enum(ROLES_REGISTRABLES, { error: "Elegí cómo querés usar LabÍA." });

const nombre = z
  .string({ error: "Ingresá tu nombre." })
  .trim()
  .min(1, "Ingresá tu nombre.")
  .max(60, "El nombre puede tener hasta 60 caracteres.");

/** Ruta interna a la que volver después de ingresar (se vuelve a validar en el servidor). */
const volver = z.string().max(500).optional();

export const esquemaIngreso = z.object({
  email,
  contrasena: z
    .string({ error: "Ingresá tu contraseña." })
    .min(1, "Ingresá tu contraseña.")
    .max(200, "La contraseña es demasiado larga."),
  volver,
});

export const esquemaRegistro = z.object({
  rol: rolRegistrable,
  nombre,
  email,
  contrasena: contrasenaNueva,
});

export const esquemaPedirRestablecer = z.object({ email });

export const esquemaNuevaContrasena = z
  .object({
    contrasena: contrasenaNueva,
    repetir: z.string({ error: "Repetí la contraseña." }).min(1, "Repetí la contraseña."),
  })
  .refine((datos) => datos.contrasena === datos.repetir, {
    path: ["repetir"],
    error: "Las contraseñas no coinciden.",
  });

export const esquemaGoogle = z.object({
  rol: rolRegistrable.optional(),
  volver,
});

export type ErroresCampos<T extends string> = Partial<Record<T, string>>;

/** Primer mensaje de error por campo, listo para mostrar al lado de cada `Campo`. */
export function erroresPorCampo<T extends string>(error: z.ZodError): ErroresCampos<T> {
  const resultado: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "");
    if (campo && !(campo in resultado)) resultado[campo] = problema.message;
  }
  return resultado as ErroresCampos<T>;
}
