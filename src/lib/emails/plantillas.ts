import type { ComponentType } from "react";

import BienvenidaCliente, { type DatosBienvenidaCliente } from "@/emails/bienvenida_cliente";
import BienvenidaProfesional, {
  type DatosBienvenidaProfesional,
} from "@/emails/bienvenida_profesional";
import DocumentoRechazado, { type DatosDocumentoRechazado } from "@/emails/documento_rechazado";
import EligieronAOtro, { type DatosEligieronAOtro } from "@/emails/eligieron_a_otro";
import NuevaPostulacion, {
  asuntoNuevaPostulacion,
  type DatosNuevaPostulacion,
} from "@/emails/nueva_postulacion";
import PedirResena, { type DatosPedirResena } from "@/emails/pedir_resena";
import PerfilPublicado, { type DatosPerfilPublicado } from "@/emails/perfil_publicado";
import TeEligieron, { type DatosTeEligieron } from "@/emails/te_eligieron";
import TrabajosCerca, {
  asuntoTrabajosCerca,
  type DatosTrabajosCerca,
} from "@/emails/trabajos_cerca";

import type { DatosPie } from "./Layout";
import type { CategoriaBaja } from "./token";

/** Datos que necesita cada plantilla. Ningún email lleva DNI, teléfonos ni direcciones. */
export interface DatosPlantillas {
  bienvenida_cliente: DatosBienvenidaCliente;
  bienvenida_profesional: DatosBienvenidaProfesional;
  perfil_publicado: DatosPerfilPublicado;
  documento_rechazado: DatosDocumentoRechazado;
  nueva_postulacion: DatosNuevaPostulacion;
  te_eligieron: DatosTeEligieron;
  eligieron_a_otro: DatosEligieronAOtro;
  trabajos_cerca: DatosTrabajosCerca;
  pedir_resena: DatosPedirResena;
}

export type Plantilla = keyof DatosPlantillas;

export type DefinicionPlantilla<K extends Plantilla> = {
  componente: ComponentType<DatosPlantillas[K] & { pie: DatosPie }>;
  asunto: (datos: DatosPlantillas[K]) => string;
  /**
   * Preferencia que controla este email. `null` = aviso de cuenta o de un trabajo en curso: se
   * manda siempre (el link de baja del pie apaga las "novedades").
   */
  preferencia: CategoriaBaja | null;
};

type Registro = { [K in Plantilla]: DefinicionPlantilla<K> };

export const PLANTILLAS: Registro = {
  bienvenida_cliente: {
    componente: BienvenidaCliente,
    asunto: () => "Te damos la bienvenida a LabÍA",
    preferencia: null,
  },
  bienvenida_profesional: {
    componente: BienvenidaProfesional,
    asunto: () => "Recibimos tu perfil en LabÍA",
    preferencia: null,
  },
  perfil_publicado: {
    componente: PerfilPublicado,
    asunto: () => "Tu perfil ya está publicado en LabÍA",
    preferencia: null,
  },
  documento_rechazado: {
    componente: DocumentoRechazado,
    asunto: (d) => `Necesitamos que vuelvas a subir tu ${d.documento}`,
    preferencia: null,
  },
  nueva_postulacion: {
    componente: NuevaPostulacion,
    asunto: asuntoNuevaPostulacion,
    preferencia: null,
  },
  te_eligieron: {
    componente: TeEligieron,
    asunto: (d) => `${d.nombreCliente} te eligió para ${d.tituloTrabajo}`,
    preferencia: null,
  },
  eligieron_a_otro: {
    componente: EligieronAOtro,
    asunto: (d) => `Novedades sobre ${d.tituloTrabajo}`,
    preferencia: "novedades",
  },
  trabajos_cerca: {
    componente: TrabajosCerca,
    asunto: (d) => asuntoTrabajosCerca(d.trabajos.length),
    preferencia: "trabajos_cerca",
  },
  pedir_resena: {
    componente: PedirResena,
    asunto: (d) => `¿Cómo te fue con ${d.nombreProfesional}?`,
    preferencia: "novedades",
  },
};

export const definicion = <K extends Plantilla>(plantilla: K): DefinicionPlantilla<K> =>
  PLANTILLAS[plantilla];
