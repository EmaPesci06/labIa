import type { EstadoFormulario } from "@/lib/auth/estado";
import type { TipoDocumento } from "@/lib/validaciones/documentos";

export type EstadoVerificacionDocumento = "pendiente" | "aprobado" | "rechazado";

export type ItemVerificacion = {
  id: string;
  tipo: TipoDocumento;
  estado: EstadoVerificacionDocumento;
  motivoRechazo: string | null;
  createdAt: string;
};

export type BarrioOpcion = { id: number; nombre: string };

/** Respuesta de `guardarPerfilProfesional` a `useActionState`. */
export type EstadoPerfil = EstadoFormulario & {
  /** Se guardó el perfil; `uid` sirve para subir las fotos a su carpeta. */
  guardado?: { uid: string };
  /** Falta algún documento obligatorio: se muestra dentro del bloque de verificación. */
  documentos?: string;
};

/** Lo que se muestra en el formulario: lo ya guardado, o lo que quedó en el borrador. */
export type BorradorPerfil = {
  nombreCompleto: string;
  whatsapp: string;
  /** Id del barrio de residencia, o "" si todavía no eligió. */
  barrioId: string;
  oficios: string[];
  especialidades: string;
  todaLaCiudad: boolean;
  zonas: number[];
  aniosExperiencia: string;
  matricula: string;
  descripcion: string;
  disponibilidad: string;
  /** Ruta de la foto de perfil en el bucket `fotos`, o "". */
  fotoPerfil: string;
  fotosTrabajos: string[];
};

export const BORRADOR_VACIO: BorradorPerfil = {
  nombreCompleto: "",
  whatsapp: "",
  barrioId: "",
  oficios: [],
  especialidades: "",
  todaLaCiudad: false,
  zonas: [],
  aniosExperiencia: "",
  matricula: "",
  descripcion: "",
  disponibilidad: "",
  fotoPerfil: "",
  fotosTrabajos: [],
};

export type SesionRegistro = { uid: string; email: string | null } | null;
