// Limpieza de datos personales antes de mandar cualquier cosa a Sentry (guía §2: sin datos personales).
// Se usa en el `beforeSend` del navegador, del servidor y del edge.

export const TEXTO_FILTRADO = "[filtrado]";

/** Campos que se borran enteros, sin importar su valor (comparación sin mayúsculas). */
const CAMPOS_PROHIBIDOS = new Set([
  "dni",
  "whatsapp",
  "documento",
  "email",
  "telefono",
  "nombre",
  "apellido",
  "direccion",
  "antecedentes",
  "antecedentes_ok",
  "matricula",
  "matricula_numero",
  "storage_path",
  "password",
  "contrasena",
  "cookie",
  "cookies",
  "authorization",
]);

/**
 * Campos técnicos que no se recorren: no tienen datos personales y reescribirlos rompería
 * los source maps o la agrupación de errores en Sentry (ids, versiones, rutas de archivos).
 */
const CAMPOS_TECNICOS = new Set([
  "stacktrace",
  "debug_meta",
  "sdk",
  "event_id",
  "trace_id",
  "span_id",
  "parent_span_id",
  "release",
  "dist",
  "environment",
  "platform",
  "modules",
  "fingerprint",
  "sdkprocessingmetadata",
  "sample_rand",
]);

const UUID = String.raw`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`;
const EMAIL = String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`;
// Regex de la tarea LAB-15. Los UUID se reconocen antes para no confundirlos con teléfonos.
const TELEFONO = String.raw`\+?\d[\d\s-]{7,}`;
const PATRON = new RegExp(`(${UUID})|${EMAIL}|${TELEFONO}`, "gi");

/** Reemplaza emails y teléfonos dentro de un texto. Los UUID (ids de usuarios, trabajos) quedan. */
export function limpiarTexto(texto: string): string {
  return texto.replace(PATRON, (coincidencia, uuid: string | undefined) =>
    uuid ? coincidencia : TEXTO_FILTRADO,
  );
}

function limpiarValor(valor: unknown, vistos: WeakSet<object>): unknown {
  if (typeof valor === "string") return limpiarTexto(valor);
  if (typeof valor !== "object" || valor === null) return valor;
  if (vistos.has(valor)) return valor;
  vistos.add(valor);

  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) valor[i] = limpiarValor(valor[i], vistos);
    return valor;
  }

  const registro = valor as Record<string, unknown>;
  for (const clave of Object.keys(registro)) {
    const claveMinuscula = clave.toLowerCase();
    if (CAMPOS_PROHIBIDOS.has(claveMinuscula)) {
      delete registro[clave];
    } else if (!CAMPOS_TECNICOS.has(claveMinuscula)) {
      registro[clave] = limpiarValor(registro[clave], vistos);
    }
  }
  return registro;
}

/**
 * Limpia un evento de Sentry en el lugar y lo devuelve: borra los campos `dni`, `whatsapp`,
 * `documento` (y otros sensibles), reemplaza emails y teléfonos en todos los textos y deja del
 * usuario solo el `id` (uuid).
 */
export function limpiarEvento<T extends object>(evento: T): T {
  const registro = evento as Record<string, unknown>;
  const usuario = registro.user;
  if (typeof usuario === "object" && usuario !== null) {
    const id = (usuario as Record<string, unknown>).id;
    registro.user = typeof id === "string" || typeof id === "number" ? { id } : undefined;
  }
  limpiarValor(registro, new WeakSet());
  return evento;
}
