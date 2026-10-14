/** Estado que devuelve la Server Action de contacto a `useActionState` (LAB-25). */
export type EstadoContacto = {
  /** Error general de la hoja, en castellano. */
  mensaje?: string;
  /** Link de WhatsApp listo para abrir. Solo viaja en la respuesta de la acción. */
  url?: string;
};

export const ESTADO_CONTACTO_INICIAL: EstadoContacto = {};
