import { z } from "zod";

// Detección de datos de contacto y direcciones en los textos libres que se muestran en pantallas
// públicas (descripciones de perfil, disponibilidad, trabajos y mensajes de postulación).
// El contacto es siempre por WhatsApp desde la app, y nunca se publica la dirección exacta (Guía §7.4 y §7.5).
// La misma lógica vive en SQL (`privado.tiene_dato_de_contacto`, migración 20261015110000). El test
// `contenido-publico.paridad.test.ts` corre los mismos casos contra las dos implementaciones.
// La detección es heurística: prefiere dejar pasar un número común (precio, medida, año, cantidad)
// antes que bloquear un texto legítimo.

export type TipoDatoPersonal = "email" | "mensajeria" | "telefono" | "direccion";

export const MENSAJE_CONTENIDO_PUBLICO =
  "No pongas teléfonos, emails ni direcciones: el contacto es por WhatsApp desde la app.";

/**
 * Textos más largos que esto no se analizan y se tratan como dato de contacto. Así un texto inflado
 * no sirve para esquivar la detección ni para disparar regex costosas. Ningún campo público llega a
 * este largo (el máximo es 1000 caracteres).
 */
export const LARGO_MAXIMO_ANALISIS = 5000;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// "laura arroba gmail punto com", "laura(at)gmail.com": el email escrito con palabras.
const EMAIL_EN_PALABRAS = /\barroba\b|\(at\)|\bpunto\s+(?:com|me|ar|net|org)\b/i;

const MENSAJERIA =
  /\b(?:wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|telegram\.me|m\.me|fb\.me|signal\.me|instagram\.com|facebook\.com)\b/i;

// Montos con signo de pesos: "$ 15000", "$ 3.500", "$15.000.000". Solo números de hasta 7 dígitos
// (con puntos de miles): un número más largo pegado a "$" se evalúa como teléfono ("Llamame al $2235551234").
const MONTO_CON_PESO = /\$\s*\d{1,7}(?!\d)(?:\.\d{3})*/g;
// Número de matrícula, registro o ENARGAS de hasta 7 dígitos: "Matrícula N° 12345". Una matrícula
// con 8 o más dígitos ("Matrícula 2235551234") se evalúa como teléfono.
const NUMERO_DE_MATRICULA =
  /(?:matr[ií]cul[a-záéíóúñ]*|mat\.?|registro|enargas)[\s.:,°º#n]{0,8}\d{1,7}(?!\d)/gi;

// Secuencia de dígitos con separadores comunes y "+" opcional. El largo está acotado.
const CANDIDATO_NUMERICO = /\+?[\d(][\d\s().-]{0,60}\d/g;
const FECHA = /^\d{1,2}([.\s-])\d{1,2}\1(?:19|20)\d{2}$/;
const RANGO_ANIOS = /^(?:19|20)\d{2}(?:\s*-\s*|\s+)(?:19|20)\d{2}$/;
const MILES = /^\d{1,3}(?:\.\d{3})+$/;
const ES_ANIO = /^(?:19|20)\d{2}$/;

// Calle o avenida seguida de una altura de 3 a 5 dígitos: "Av. Colón 1234", "calle 12 n 1234".
// Una altura de 1 o 2 dígitos ("Calle 3 de Abril", "calle 12") no cuenta.
const CALLE_CON_NUMERO =
  /\b(?:calle|av(?:\.|enida)?|pasaje|pje\.?|bv\.?|boulevard|diagonal|diag\.?)\s+(?:[\p{L}.\d]+\s+){0,3}?(?:n[°º.]?\s*)?\d{3,5}\b/iu;

// Unidades que van después de un número y lo vuelven medida, no altura: "1200 mm", "220 V".
const UNIDADES = sinMayusculas(
  "v|volts?|mm|cm|m2|m|mts?|metros?|kgs?|kg|lts?|litros?|l|w|kw|amp|hs|horas?|ml|pesos|usd",
);
// Nombre propio (mayúscula inicial real, sin flag i) seguido de 4 o 5 dígitos: "Independencia 2100".
const NOMBRE_CON_NUMERO = new RegExp(
  String.raw`\b\p{Lu}\p{Ll}+(?:\s+(?:de|del|y|\p{Lu}\p{Ll}+))?\s+(?:n[°º.]?\s*)?(\d{4,5})\b(?!\s*(?:${UNIDADES})\b)`,
  "gu",
);

/** "v|mm" → "[vV]|[mM][mM]": una alternativa que no distingue mayúsculas, sin usar el flag i. */
function sinMayusculas(alternativas: string): string {
  return alternativas.replace(
    /[a-z]/gi,
    (letra) => `[${letra.toLowerCase()}${letra.toUpperCase()}]`,
  );
}

/**
 * NFKC (anchos completos y ligaduras a su forma común) y dígitos de cualquier alfabeto a ASCII.
 * Así "２２３" y "٢٢٣" se leen igual que "223" en la base (migración 20261015110000).
 */
function normalizar(texto: string): string {
  return texto
    .normalize("NFKC")
    .replace(/\p{Nd}/gu, (digito) => (/[0-9]/.test(digito) ? digito : valorDeDigito(digito)));
}

/**
 * Valor (0-9) de un dígito Unicode no ASCII (árabe, devanagari, etc.). Cada bloque de dígitos es una
 * secuencia de 10 code points que empieza en su cero, así que el valor sale de la distancia al inicio
 * de la corrida de \p{Nd}. La misma regla genera la tabla SQL de la migración.
 */
export function valorDeDigito(digito: string): string {
  const codigo = digito.codePointAt(0) ?? 0;
  let inicio = codigo;
  while (inicio > 0 && /\p{Nd}/u.test(String.fromCodePoint(inicio - 1))) inicio--;
  return String((codigo - inicio) % 10);
}

function esTelefono(run: string): boolean {
  const digitos = run.replace(/\D/g, "");
  if (digitos.length < 8) return false;
  if (FECHA.test(run) || RANGO_ANIOS.test(run) || MILES.test(run)) return false;
  if (run.startsWith("+")) return true;
  // Sin "+", un número tiene al menos un grupo de dos dígitos (una lista "1 2 3 4 5 6 7 8" no cuenta).
  return run.split(/[\s.()+-]+/).some((grupo) => grupo.length >= 2);
}

/**
 * Devuelve qué tipo de dato de contacto o dirección trae el texto, o `null` si no trae ninguno.
 * Un texto más largo que `LARGO_MAXIMO_ANALISIS` se informa como "telefono" sin analizarlo.
 */
export function detectarDatoDeContacto(texto: string): TipoDatoPersonal | null {
  // Largo en code points, igual que length() de SQL (un emoji o un dígito astral cuentan como uno).
  if ([...texto].length > LARGO_MAXIMO_ANALISIS) return "telefono";

  const normal = normalizar(texto);
  if (EMAIL.test(normal) || EMAIL_EN_PALABRAS.test(normal)) return "email";
  if (MENSAJERIA.test(normal)) return "mensajeria";

  // Montos y matrículas se quitan antes de buscar teléfonos y alturas.
  const limpio = normal.replace(MONTO_CON_PESO, " ").replace(NUMERO_DE_MATRICULA, " ");

  for (const coincidencia of limpio.matchAll(CANDIDATO_NUMERICO)) {
    if (esTelefono(coincidencia[0])) return "telefono";
  }

  if (CALLE_CON_NUMERO.test(limpio)) return "direccion";
  for (const coincidencia of limpio.matchAll(NOMBRE_CON_NUMERO)) {
    if (!ES_ANIO.test(coincidencia[1] ?? "")) return "direccion";
  }
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

/**
 * Nombre completo sin datos de contacto, revisando nombre y apellido por separado. Parte igual que
 * `separarNombre`: la primera palabra es el nombre y el resto, el apellido. Así el error sale junto
 * al campo y no como un `check_violation` genérico de la base.
 */
export const nombreSinDatosDeContacto = (valor: string): boolean => {
  const [nombre = "", ...resto] = valor.trim().split(/\s+/);
  return sinDatosDeContacto(nombre) && sinDatosDeContacto(resto.join(" "));
};

/**
 * Texto libre que se muestra en el perfil público: sin teléfonos, emails ni direcciones. Si pasa el
 * largo máximo, el refine no corre (abort), así el texto largo nunca llega al análisis.
 */
export const textoLibrePublico = (maximo: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(maximo, { error: mensaje, abort: true })
    .refine(sinDatosDeContacto, MENSAJE_CONTENIDO_PUBLICO)
    .transform((valor) => (valor === "" ? null : valor));
