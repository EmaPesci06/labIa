/** Estado que devuelven las Server Actions de formularios de acceso a `useActionState`. */
export type EstadoFormulario = {
  /** Mensaje de error por campo, en castellano. */
  errores?: Partial<Record<string, string>>;
  /** Error general del formulario (credenciales, límite de intentos…). */
  mensaje?: string;
  /** Confirmación (por ejemplo "Te enviamos un email"). */
  exito?: string;
  /** Valores no sensibles para repoblar el formulario (nunca la contraseña). */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
