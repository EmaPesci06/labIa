import { OFICIOS, type Oficio } from "./busqueda";

export { OFICIOS, type Oficio };

type DatosOficio = {
  /** Nombre del oficio: "Gas", "Plomería". */
  nombre: string;
  /** Quien lo ejerce: "Gasista", "Plomero". */
  profesional: string;
  /** Título de los resultados: "Gasistas", "Plomeros". */
  plural: string;
  /** Con matrícula habilitante (solo ellos tienen el filtro "Solo matriculados"). */
  matriculable: boolean;
};

const DATOS: Record<Oficio, DatosOficio> = {
  gas: { nombre: "Gas", profesional: "Gasista", plural: "Gasistas", matriculable: true },
  electricidad: {
    nombre: "Electricidad",
    profesional: "Electricista",
    plural: "Electricistas",
    matriculable: true,
  },
  plomeria: {
    nombre: "Plomería",
    profesional: "Plomero",
    plural: "Plomeros",
    matriculable: false,
  },
  cerrajeria: {
    nombre: "Cerrajería",
    profesional: "Cerrajero",
    plural: "Cerrajeros",
    matriculable: false,
  },
  carpinteria: {
    nombre: "Carpintería",
    profesional: "Carpintero",
    plural: "Carpinteros",
    matriculable: false,
  },
  pintura: { nombre: "Pintura", profesional: "Pintor", plural: "Pintores", matriculable: false },
  mecanica: {
    nombre: "Mecánica",
    profesional: "Mecánico",
    plural: "Mecánicos",
    matriculable: false,
  },
};

/** Orden en que se muestran los oficios (el de la grilla del inicio). */
export const OFICIOS_ORDENADOS: readonly Oficio[] = [
  "gas",
  "electricidad",
  "plomeria",
  "cerrajeria",
  "carpinteria",
  "pintura",
  "mecanica",
];

export const nombreOficio = (oficio: Oficio): string => DATOS[oficio].nombre;
export const pluralOficio = (oficio: Oficio | undefined): string =>
  oficio ? DATOS[oficio].plural : "Profesionales";
export const esMatriculable = (oficio: Oficio | undefined): boolean =>
  oficio ? DATOS[oficio].matriculable : false;

/** "Gasista" si ejerce uno solo; "Gas y plomería" o "Gas, plomería y pintura" si ejerce varios. */
export function descripcionOficios(oficios: readonly Oficio[]): string {
  const [primero, ...resto] = oficios;
  if (!primero) return "Profesional";
  if (resto.length === 0) return DATOS[primero].profesional;
  const nombres = [DATOS[primero].nombre, ...resto.map((o) => DATOS[o].nombre.toLowerCase())];
  const ultimo = nombres.pop();
  return nombres.length ? `${nombres.join(", ")} y ${ultimo}` : (ultimo ?? "Profesional");
}
