import type { Oficio } from "./oficios";

/**
 * "¿Qué se rompió?" del inicio: problemas frecuentes que llevan a un oficio. La tabla es fija en
 * código (sin base de datos, según LAB-71). Los textos son los del boceto `App-Inicio` y
 * `App-Escritorio`.
 */
export type Problema = {
  slug: string;
  etiqueta: string;
  oficio: Oficio;
  /** Solo se muestra en escritorio (el boceto de celular no los trae). */
  soloEscritorio?: boolean;
};

export const PROBLEMAS: readonly Problema[] = [
  { slug: "pierde-canilla", etiqueta: "Pierde una canilla", oficio: "plomeria" },
  { slug: "salto-termica", etiqueta: "Saltó la térmica", oficio: "electricidad" },
  { slug: "me-quedo-afuera", etiqueta: "Me quedé afuera", oficio: "cerrajeria" },
  { slug: "olor-a-gas", etiqueta: "Hay olor a gas", oficio: "gas" },
  { slug: "se-tapo-el-bano", etiqueta: "Se tapó el baño", oficio: "plomeria" },
  {
    slug: "humedad-en-la-pared",
    etiqueta: "Humedad en la pared",
    oficio: "pintura",
    soloEscritorio: true,
  },
  {
    slug: "no-arranca-el-auto",
    etiqueta: "No arranca el auto",
    oficio: "mecanica",
    soloEscritorio: true,
  },
];

/** Problema que se muestra si la URL no trae uno válido (el primero del boceto). */
export const PROBLEMA_POR_DEFECTO: Problema = PROBLEMAS[0] as Problema;

/** Busca un problema por su slug de URL. `undefined` si no existe. */
export function problemaPorSlug(slug: string | undefined): Problema | undefined {
  if (!slug) return undefined;
  return PROBLEMAS.find((p) => p.slug === slug);
}

/** Título del resultado: "Eso lo arregla una plomera", como en el boceto. */
export const TITULO_RESULTADO: Record<Oficio, string> = {
  gas: "Eso lo arregla un gasista",
  electricidad: "Eso lo arregla un electricista",
  plomeria: "Eso lo arregla una plomera",
  cerrajeria: "Eso lo arregla un cerrajero",
  carpinteria: "Eso lo arregla un carpintero",
  pintura: "Eso lo arregla un pintor",
  mecanica: "Eso lo arregla un mecánico",
};
