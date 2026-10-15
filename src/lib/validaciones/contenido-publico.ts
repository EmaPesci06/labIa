// Detección de datos de contacto y direcciones en los textos libres que se muestran en pantallas
// públicas (descripciones de perfil, disponibilidad, trabajos y mensajes de postulación).
// El contacto es siempre por WhatsApp desde la app, y nunca se publica la dirección exacta (Guía §7.4 y §7.5).
// La detección es heurística: prefiere dejar pasar un número común (precio, medida, año, cantidad)
// antes que bloquear un texto legítimo. Sirve como capa de UX; la RLS y las RPC no la reemplazan.

export type TipoDatoPersonal = "email" | "mensajeria" | "telefono" | "direccion";

export const MENSAJE_CONTENIDO_PUBLICO =
  "No pongas teléfonos, emails ni direcciones: el contacto es por WhatsApp desde la app.";

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// "laura arroba gmail punto com": el email escrito con palabras.
const EMAIL_EN_PALABRAS = /\barroba\b/i;

const MENSAJERIA =
  /\b(?:wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|m\.me|fb\.me|signal\.me|instagram\.com|facebook\.com)\b/i;

// Secuencias de dígitos con separadores comunes (espacio, punto, guion, paréntesis) y "+" opcional.
const CANDIDATO_NUMERICO = /\+?[\d(][\d\s().-]*\d/g;
const FECHA = /^\d{1,2}[.-]\d{1,2}[.-](?:19|20)\d{2}$/;
const RANGO_ANIOS = /^(?:19|20)\d{2}\s*-\s*(?:19|20)\d{2}$/;
// Miles con punto argentino: 15.000 o 15.000.000.
const MILES = /^\d{1,3}(?:\.\d{3})+$/;

// Calle o avenida seguida de un número: "Av. Colón 1234", "calle 12 n 1234", "Pasaje Mitre 500".
const CALLE_CON_NUMERO =
  /\b(?:calle|av(?:\.|enida)?|pasaje|pje\.?|bv\.?|boulevard|diagonal|diag\.?)\s+(?:[\p{L}.]+\s+){0,3}?(?:n[°º.]?\s*)?\d{1,5}\b/iu;
// Nombre propio seguido de 4 o 5 dígitos (sin año ni unidad): "Independencia 2100", "Mitre n° 1234".
const NOMBRE_CON_NUMERO =
  /\b\p{Lu}\p{Ll}+(?:\s+(?:de|del|y|\p{Lu}\p{Ll}+))?\s+(?:n[°º.]?\s*)?(\d{4,5})\b(?!\s*(?:v|volts?|mm|cm|m|m2|m²|mts?|metros?|kg|kgs|l|lts?|litros?|w|kw|amp|hs|horas?|ml|pesos|usd|%)\b)/iu;
const ES_ANIO = /^(?:19|20)\d{2}$/;

/** ¿El número va precedido por el signo de pesos? ("$ 15000", "$15.000") */
function precedidoPorPeso(texto: string, indice: number): boolean {
  let i = indice - 1;
  while (i >= 0 && /\s/.test(texto.charAt(i))) i--;
  return texto.charAt(i) === "$";
}

function esTelefono(run: string): boolean {
  const digitos = run.replace(/\D/g, "");
  if (digitos.length < 8) return false;
  if (FECHA.test(run) || RANGO_ANIOS.test(run) || MILES.test(run)) return false;
  // Sin "+", un número tiene al menos un grupo de dos dígitos (así una lista "1 2 3 4 5 6 7 8" no cuenta).
  if (!run.startsWith("+")) {
    const grupos = run.split(/[\s.()+-]+/).filter(Boolean);
    if (!grupos.some((grupo) => grupo.length >= 2)) return false;
  }
  return true;
}

function hayTelefono(texto: string): boolean {
  for (const coincidencia of texto.matchAll(CANDIDATO_NUMERICO)) {
    const run = coincidencia[0];
    const indice = coincidencia.index ?? 0;
    if (precedidoPorPeso(texto, indice)) continue;
    if (esTelefono(run)) return true;
  }
  return false;
}

function hayDireccion(texto: string): boolean {
  if (CALLE_CON_NUMERO.test(texto)) return true;
  const nombre = NOMBRE_CON_NUMERO.exec(texto);
  return nombre !== null && !ES_ANIO.test(nombre[1] ?? "");
}

/**
 * Devuelve qué tipo de dato de contacto o dirección trae el texto, o `null` si no trae ninguno.
 * El orden de chequeo es email, mensajería, teléfono y dirección.
 */
export function detectarDatoDeContacto(texto: string): TipoDatoPersonal | null {
  if (EMAIL.test(texto) || EMAIL_EN_PALABRAS.test(texto)) return "email";
  if (MENSAJERIA.test(texto)) return "mensajeria";
  if (hayTelefono(texto)) return "telefono";
  if (hayDireccion(texto)) return "direccion";
  return null;
}

/** ¿El texto trae un teléfono, un email, un link de mensajería o una dirección exacta? */
export function tieneDatosDeContacto(texto: string): boolean {
  return detectarDatoDeContacto(texto) !== null;
}

/** Predicado para `.refine`: `true` cuando el texto no trae datos de contacto ni direcciones. */
export const sinDatosDeContacto = (valor: string | null | undefined): boolean => {
  if (!valor) return true;
  return !tieneDatosDeContacto(valor);
};
