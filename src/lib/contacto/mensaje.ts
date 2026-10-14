import type { ORIGENES_CONTACTO } from "@/lib/validaciones/contacto";

type Origen = (typeof ORIGENES_CONTACTO)[number];

export type DatosMensajeContacto = {
  origen: Origen;
  /** Nombre del profesional tal como se muestra en el perfil. */
  nombreProfesional: string;
  /** Profesión en minúscula: "gasista", "plomero". */
  profesion: string;
  /** Barrio del cliente (nunca la dirección). `null` si no lo tiene cargado. */
  barrioCliente: string | null;
  /** Título del trabajo, solo para el origen "postulacion". */
  tituloTrabajo?: string;
};

/**
 * Texto que se abre prellenado en WhatsApp (LAB-25). Se arma en el servidor con datos que ya
 * tiene: el cliente no puede cambiarlo desde el navegador.
 */
export function armarMensajeContacto(datos: DatosMensajeContacto): string {
  if (datos.origen === "postulacion") {
    const titulo = datos.tituloTrabajo ?? "tu trabajo";
    return `Hola ${datos.nombreProfesional}, te elegí en LabÍA para el trabajo "${titulo}". ¿Coordinamos?`;
  }
  const lugar = datos.barrioCliente ? ` en ${datos.barrioCliente}` : "";
  return `Hola ${datos.nombreProfesional}, te encontré en LabÍA. Necesito un/a ${datos.profesion}${lugar}. ¿Podés ayudarme?`;
}
