import { z } from "zod";

import { normalizarTelefono } from "@/lib/whatsapp";

import { esquemaRegistro } from "./auth";

/** Los 7 oficios del MVP: valor del enum `oficio` de la base y texto para la interfaz. */
export const OFICIOS = [
  { valor: "carpinteria", etiqueta: "Carpintería" },
  { valor: "plomeria", etiqueta: "Plomería" },
  { valor: "cerrajeria", etiqueta: "Cerrajería" },
  { valor: "gas", etiqueta: "Gas" },
  { valor: "pintura", etiqueta: "Pintura" },
  { valor: "mecanica", etiqueta: "Mecánica" },
  { valor: "electricidad", etiqueta: "Electricidad" },
] as const;

export type ValorOficio = (typeof OFICIOS)[number]["valor"];

const VALORES_OFICIO = OFICIOS.map((o) => o.valor) as [ValorOficio, ...ValorOficio[]];

export const MAX_BARRIOS = 10;
export const MAX_FOTOS_TRABAJOS = 10;
export const MAX_DESCRIPCION = 500;
export const MAX_TEXTO_CORTO = 120;

/** Barrios que se ofrecen como chips (ids de la migración de barrios; los ids no cambian). */
export const BARRIOS_FRECUENTES = [
  { id: 17, nombre: "Centro" },
  { id: 51, nombre: "La Perla" },
  { id: 20, nombre: "Chauvín" },
  { id: 67, nombre: "Los Troncos" },
  { id: 84, nombre: "Punta Mogotes" },
  { id: 22, nombre: "Constitución" },
  { id: 83, nombre: "Puerto" },
] as const;

/** "Martín Gómez" → { nombre: "Martín", apellido: "Gómez" }. El apellido es todo lo que sigue. */
export function separarNombre(completo: string): { nombre: string; apellido: string } {
  const partes = completo.trim().split(/\s+/).filter(Boolean);
  const [nombre = "", ...resto] = partes;
  return { nombre, apellido: resto.join(" ") };
}

const textoOpcional = (maximo: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(maximo, mensaje)
    .transform((valor) => (valor === "" ? null : valor));

export const esquemaPerfilProfesional = z
  .object({
    nombreCompleto: z
      .string({ error: "Ingresá tu nombre y apellido." })
      .trim()
      .min(1, "Ingresá tu nombre y apellido.")
      .max(120, "El nombre es demasiado largo.")
      .refine((valor) => separarNombre(valor).apellido !== "", "Ingresá tu nombre y apellido.")
      .refine((valor) => {
        const { nombre, apellido } = separarNombre(valor);
        return nombre.length <= 60 && apellido.length <= 60;
      }, "El nombre y el apellido pueden tener hasta 60 caracteres cada uno."),
    whatsapp: z
      .string({ error: "Ingresá tu WhatsApp." })
      .trim()
      .min(1, "Ingresá tu WhatsApp.")
      .transform((valor, contexto) => {
        const e164 = normalizarTelefono(valor);
        if (!e164) {
          contexto.issues.push({
            code: "custom",
            input: valor,
            message: "Revisá el WhatsApp. Ejemplo: 223 555-0000.",
          });
          return z.NEVER;
        }
        return e164;
      }),
    barrioId: z.coerce
      .number({ error: "Elegí tu barrio." })
      .int("Elegí tu barrio.")
      .positive("Elegí tu barrio."),
    oficios: z
      .array(z.enum(VALORES_OFICIO, { error: "Elegí un oficio de la lista." }))
      .min(1, "Elegí al menos un oficio.")
      .max(VALORES_OFICIO.length)
      .transform((valores) => [...new Set(valores)]),
    especialidades: textoOpcional(
      MAX_TEXTO_CORTO,
      `Las especialidades pueden tener hasta ${MAX_TEXTO_CORTO} caracteres.`,
    ),
    todaLaCiudad: z.boolean(),
    zonas: z
      .array(z.coerce.number().int().positive())
      .max(MAX_BARRIOS, `Podés elegir hasta ${MAX_BARRIOS} barrios.`)
      .transform((ids) => [...new Set(ids)]),
    aniosExperiencia: z
      .string()
      .trim()
      .refine(
        (valor) => valor === "" || (/^\d{1,2}$/.test(valor) && Number(valor) <= 60),
        "Los años de experiencia van de 0 a 60.",
      )
      .transform((valor) => (valor === "" ? null : Number(valor))),
    matricula: textoOpcional(40, "La matrícula puede tener hasta 40 caracteres."),
    descripcion: textoOpcional(
      MAX_DESCRIPCION,
      `La descripción puede tener hasta ${MAX_DESCRIPCION} caracteres.`,
    ),
    disponibilidad: textoOpcional(
      MAX_TEXTO_CORTO,
      `La disponibilidad puede tener hasta ${MAX_TEXTO_CORTO} caracteres.`,
    ),
    /** Foto de perfil ya subida (ruta en el bucket `fotos`), o vacío. */
    fotoPerfil: z.string().max(300).default(""),
    /** Fotos de trabajos ya subidas que se conservan. */
    fotosTrabajos: z
      .array(z.string().max(300))
      .max(MAX_FOTOS_TRABAJOS, `Podés subir hasta ${MAX_FOTOS_TRABAJOS} fotos de trabajos.`),
  })
  .superRefine((datos, contexto) => {
    // Gasista sin matrícula no avanza (Guía §4: la matrícula es obligatoria para Gas).
    if (datos.oficios.includes("gas") && !datos.matricula) {
      contexto.addIssue({
        code: "custom",
        path: ["matricula"],
        message: "La matrícula es obligatoria para gasistas.",
      });
    }
    if (!datos.todaLaCiudad && datos.zonas.length === 0) {
      contexto.addIssue({
        code: "custom",
        path: ["zonas"],
        message: "Elegí dónde trabajás: toda la ciudad o al menos un barrio.",
      });
    }
  })
  .transform((datos) => ({
    ...datos,
    // "Toda la ciudad" reemplaza a los barrios sueltos.
    zonas: datos.todaLaCiudad ? [] : datos.zonas,
    ...separarNombre(datos.nombreCompleto),
  }));

export type PerfilProfesionalValidado = z.output<typeof esquemaPerfilProfesional>;

/** Email y contraseña, solo cuando todavía no hay cuenta. */
export const esquemaCuentaNueva = esquemaRegistro.pick({ email: true, contrasena: true });

const texto = (datos: FormData, clave: string): string => {
  const valor = datos.get(clave);
  return typeof valor === "string" ? valor : "";
};

const lista = (datos: FormData, clave: string): string[] =>
  datos.getAll(clave).filter((v): v is string => typeof v === "string");

/** Arma la entrada del esquema a partir del `FormData` del formulario. */
export function leerPerfilProfesional(datos: FormData) {
  return {
    nombreCompleto: texto(datos, "nombreCompleto"),
    whatsapp: texto(datos, "whatsapp"),
    barrioId: texto(datos, "barrioId"),
    oficios: lista(datos, "oficios"),
    especialidades: texto(datos, "especialidades"),
    todaLaCiudad: texto(datos, "todaLaCiudad") === "true",
    zonas: lista(datos, "zonas"),
    aniosExperiencia: texto(datos, "aniosExperiencia"),
    matricula: texto(datos, "matricula"),
    descripcion: texto(datos, "descripcion"),
    disponibilidad: texto(datos, "disponibilidad"),
    fotoPerfil: texto(datos, "fotoPerfil"),
    fotosTrabajos: lista(datos, "fotosTrabajos"),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ARCHIVO = /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;

function rutaPropia(ruta: string, carpeta: string, uid: string): boolean {
  if (!UUID.test(uid)) return false;
  const partes = ruta.split("/");
  return (
    partes.length === 3 && partes[0] === carpeta && partes[1] === uid && ARCHIVO.test(partes[2] ?? "")
  );
}

/** ¿La ruta es una foto de perfil de esta persona? (`perfiles/<uid>/<archivo>`) */
export const esRutaFotoPerfil = (ruta: string, uid: string) =>
  rutaPropia(ruta, "perfiles", uid);

/** ¿La ruta es una foto de trabajo de esta persona? (`trabajos-hechos/<uid>/<archivo>`) */
export const esRutaFotoTrabajo = (ruta: string, uid: string) =>
  rutaPropia(ruta, "trabajos-hechos", uid);
