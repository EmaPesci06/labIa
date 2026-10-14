// "Descargar mis datos" (Ley 25.326, derecho de acceso). Funciones puras: la lectura de la base la
// hace el Route Handler con la sesión de la persona (la RLS acota todo a lo suyo) y acá se arma el
// JSON con una lista blanca de campos. Nunca salen rutas de archivos (`foto_path`, `fotos`,
// `storage_path`) ni datos de otras personas más que "Nombre I.".

const ZONA = "America/Argentina/Buenos_Aires";

/** "Laura" + "Fernández" → "Laura F.". Sin nombre: "Persona de LabÍA". */
export function nombreConInicial(
  nombre: string | null | undefined,
  apellidoOInicial: string | null | undefined,
): string {
  const n = nombre?.trim();
  if (!n) return "Persona de LabÍA";
  const inicial = apellidoOInicial?.trim().charAt(0).toUpperCase();
  return inicial ? `${n} ${inicial}.` : n;
}

/** `labia-mis-datos-2026-10-14.json`, con la fecha de Buenos Aires. */
export function nombreArchivoExportacion(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
  return `labia-mis-datos-${partes}.json`;
}

type Fila = Record<string, unknown>;

/** Copia solo los campos permitidos de una fila. */
function elegir(fila: Fila, campos: readonly string[]): Fila {
  return Object.fromEntries(campos.map((campo) => [campo, fila[campo] ?? null]));
}

const CAMPOS = {
  usuario: [
    "rol",
    "nombre",
    "apellido",
    "whatsapp",
    "estado",
    "normas_version",
    "normas_aceptadas_at",
    "created_at",
  ],
  perfil: [
    "oficios",
    "especialidades",
    "descripcion",
    "anios_experiencia",
    "toda_la_ciudad",
    "disponibilidad",
    "identidad_verificada",
    "antecedentes_ok",
    "matriculado",
    "publicado",
    "promedio",
    "cantidad_resenas",
    "created_at",
  ],
  trabajo: [
    "id",
    "oficio",
    "titulo",
    "descripcion",
    "urgencia",
    "presupuesto_estimado",
    "estado",
    "created_at",
  ],
  postulacion: [
    "trabajo_id",
    "mensaje",
    "precio_estimado",
    "sena_propuesta",
    "estado",
    "created_at",
  ],
  contacto: ["origen", "created_at"],
  resena: ["puntaje", "texto", "created_at"],
  reporte: ["objetivo_tipo", "motivo", "detalle", "estado", "created_at"],
  verificacion: ["tipo", "estado", "motivo_rechazo", "created_at"],
} as const;

export type EntradaExportacion = {
  fecha: Date;
  /** Id de la persona que descarga. */
  yo: string;
  email: string | null;
  usuario: Fila | null;
  barrio: string | null;
  perfil: Fila | null;
  barriosDeZonas: string[];
  matricula: string | null;
  preferenciasEmail: Fila | null;
  /** Trabajos como cliente (`mis_trabajos`) y como profesional elegido (`trabajos_asignados`). */
  trabajosPublicados: Fila[];
  trabajosAsignados: Fila[];
  postulacionesEnviadas: Fila[];
  postulacionesRecibidas: Fila[];
  contactos: Fila[];
  resenasEscritas: Fila[];
  resenasRecibidas: Fila[];
  reportesHechos: Fila[];
  verificaciones: Fila[];
  /** Nombre de otras personas por id: se reduce a "Nombre I.". */
  personas: Map<string, { nombre: string | null; apellido: string | null }>;
};

/** Arma el JSON de "Descargar mis datos". */
export function armarExportacion(e: EntradaExportacion): Fila {
  const persona = (id: unknown): string => {
    const p = typeof id === "string" ? e.personas.get(id) : undefined;
    return nombreConInicial(p?.nombre, p?.apellido);
  };

  return {
    generado_en: e.fecha.toISOString(),
    cuenta: {
      email: e.email,
      ...(e.usuario ? elegir(e.usuario, CAMPOS.usuario) : {}),
      barrio: e.barrio,
    },
    perfil_profesional: e.perfil
      ? {
          ...elegir(e.perfil, CAMPOS.perfil),
          matricula_numero: e.matricula,
          zonas: e.barriosDeZonas,
        }
      : null,
    preferencias_email: e.preferenciasEmail
      ? elegir(e.preferenciasEmail, ["trabajos_cerca", "novedades"])
      : null,
    trabajos_publicados: e.trabajosPublicados.map((t) => elegir(t, CAMPOS.trabajo)),
    trabajos_como_profesional: e.trabajosAsignados.map((t) => ({
      ...elegir(t, CAMPOS.trabajo),
      cliente: persona(t.cliente_id),
    })),
    postulaciones_enviadas: e.postulacionesEnviadas.map((p) => elegir(p, CAMPOS.postulacion)),
    postulaciones_recibidas: e.postulacionesRecibidas.map((p) => ({
      profesional: persona(p.profesional_id),
      ...elegir(p, ["trabajo_id", "precio_estimado", "estado", "created_at"]),
    })),
    contactos: e.contactos.map((c) => ({
      ...elegir(c, CAMPOS.contacto),
      con: persona(c.cliente_id === e.yo ? c.profesional_id : c.cliente_id),
    })),
    resenas_escritas: e.resenasEscritas.map((r) => ({
      ...elegir(r, CAMPOS.resena),
      profesional: persona(r.profesional_id),
    })),
    resenas_recibidas: e.resenasRecibidas.map((r) => ({
      ...elegir(r, CAMPOS.resena),
      autor: persona(r.autor_id),
    })),
    reportes_hechos: e.reportesHechos.map((r) => elegir(r, CAMPOS.reporte)),
    verificaciones: e.verificaciones.map((v) => elegir(v, CAMPOS.verificacion)),
  };
}
