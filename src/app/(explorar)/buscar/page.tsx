import type { Metadata } from "next";
import Link from "next/link";

import { PanelBusqueda } from "@/components/busqueda/PanelBusqueda";
import { RegistrarBusqueda } from "@/components/busqueda/RegistrarBusqueda";
import { TarjetaProfesional } from "@/components/TarjetaProfesional";
import { Boton } from "@/components/ui/Boton";
import { Vacio } from "@/components/ui/Vacio";
import { elegirBarrio, nombreDeBarrio } from "@/lib/barrios-busqueda";
import {
  buscarProfesionales,
  ErrorBusqueda,
  leerParametrosBusqueda,
  type Oficio,
  type PaginaResultados,
  type ParametrosBusqueda,
} from "@/lib/busqueda";
import { barrioDeLaCuenta, obtenerBarrios } from "@/lib/busqueda-servidor";
import { urlBusqueda } from "@/lib/busqueda-url";
import { bloqueoLecturaPublica } from "@/lib/limites";
import { nombreOficio, pluralOficio } from "@/lib/oficios";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

type ParametrosUrl = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<ParametrosUrl> };

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

/** Barrio efectivo: el de la URL, si no el de la cuenta, si no el Centro. */
async function resolverBarrio(crudo: ParametrosUrl) {
  // Independientes entre sí: juntas (LAB-88).
  const [barrios, sesion] = await Promise.all([obtenerBarrios(), obtenerSesion()]);
  const slug = elegirBarrio(
    barrios,
    primero(crudo.barrio)?.trim() || undefined,
    await barrioDeLaCuenta(sesion),
  );
  return { barrios, slug };
}

function leer(crudo: ParametrosUrl, slug: string): ParametrosBusqueda | ErrorBusqueda {
  try {
    return leerParametrosBusqueda({ ...crudo, barrio: slug });
  } catch (error) {
    if (error instanceof ErrorBusqueda) return error;
    throw error;
  }
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // Primero el acceso a searchParams (lo hace dinámico en el build); después el tope por IP (M-03).
  const crudo = await searchParams;
  const [bloqueo, { barrios, slug }] = await Promise.all([
    bloqueoLecturaPublica("busqueda"),
    resolverBarrio(crudo),
  ]);
  if (bloqueo) return { title: "Buscar · Oficio Seguro", robots: { index: false } };
  const params = leer(crudo, slug);
  const oficio = params instanceof ErrorBusqueda ? undefined : params.oficio;
  return {
    title: `${pluralOficio(oficio)} en ${nombreDeBarrio(barrios, slug)}, Mar del Plata · Oficio Seguro`,
  };
}

/** Páginas 1..N juntas: "Ver más" agrega 20 sin perder lo que ya se veía. */
const MAX_PAGINAS_ACUMULADAS = 5;

async function cargarResultados(
  crudo: ParametrosUrl,
  slug: string,
  hasta: number,
  barrioId: number | undefined,
): Promise<PaginaResultados> {
  const supabase = await crearClienteServidor();
  const primera = await buscarProfesionales(
    supabase,
    { ...crudo, barrio: slug, pagina: "1" },
    barrioId,
  );
  const ultima = Math.min(hasta, primera.paginas, MAX_PAGINAS_ACUMULADAS);
  const siguientes = await Promise.all(
    Array.from({ length: Math.max(0, ultima - 1) }, (_, i) =>
      buscarProfesionales(supabase, { ...crudo, barrio: slug, pagina: String(i + 2) }, barrioId),
    ),
  );
  return {
    ...primera,
    profesionales: [...primera.profesionales, ...siguientes.flatMap((p) => p.profesionales)],
    pagina: ultima,
  };
}

const MENSAJE_FALLA = "No pudimos buscar en este momento. Probá de nuevo.";

function ErrorEnBusqueda({ mensaje }: { mensaje: string }) {
  return (
    <div role="alert">
      <Vacio
        titulo={mensaje}
        accion={
          <Boton href="/inicio" variante="secundario">
            Volver al inicio
          </Boton>
        }
      />
    </div>
  );
}

/** "Plomería cerca de La Perla", o "Profesionales en toda la ciudad" sin oficio. */
function tituloBusqueda(oficio: Oficio | undefined, nombreBarrio: string, todaLaCiudad: boolean) {
  const donde = todaLaCiudad ? "en toda la ciudad" : `cerca de ${nombreBarrio}`;
  return oficio ? `${nombreOficio(oficio)} ${donde}` : `Profesionales ${donde}`;
}

/** "8 verificados, del más cercano al más lejano" (boceto `Esc-Buscar`). */
function textoResultados(total: number, p: ParametrosBusqueda): string {
  const cantidad = `${total} ${total === 1 ? "verificado" : "verificados"}`;
  const orden =
    p.orden === "calificacion" ? "de mejor a peor calificación" : "del más cercano al más lejano";
  return `${cantidad}, ${orden}`;
}

/** Columna de escritorio: publicar, y qué quiere decir "verificado" (boceto `Esc-Buscar`). */
function AsideBusqueda() {
  return (
    <>
      <section
        aria-labelledby="no-querer-elegir"
        className="flex flex-col gap-2.5 rounded-[28px] border-[3px] border-dashed border-texto p-6"
      >
        <h2 id="no-querer-elegir" className="font-titulo text-[28px] leading-tight font-extrabold">
          ¿No querés elegir?
        </h2>
        <p className="text-base leading-snug">
          Contá qué se rompió y que te escriban los profesionales que pueden ir.
        </p>
        <Link
          href="/trabajos/nuevo"
          className="mt-1 flex min-h-14 items-center justify-center rounded-[18px] bg-accion px-4 text-[17px] font-bold text-sobre-accion no-underline hover:bg-accion hover:text-sobre-accion"
        >
          Publicar el trabajo
        </Link>
      </section>
      <section
        aria-labelledby="que-es-verificado"
        className="flex flex-col gap-2 rounded-[28px] bg-superficie p-6"
      >
        <h2 id="que-es-verificado" className="font-titulo text-[22px] leading-tight font-extrabold">
          Qué quiere decir “verificado”
        </h2>
        <p className="text-base leading-snug">
          Revisamos su documento y su certificado de antecedentes antes de mostrarlo. A los
          gasistas, además, la matrícula.
        </p>
        <p className="text-base leading-snug">
          La distancia es desde el centro de tu barrio: nunca te pedimos la dirección.
        </p>
      </section>
    </>
  );
}

export default async function Buscar({ searchParams }: Props) {
  const crudo = await searchParams;
  // El tope por IP y el barrio no dependen uno del otro: se piden juntos (LAB-88).
  const [bloqueo, { barrios, slug }] = await Promise.all([
    bloqueoLecturaPublica("busqueda"),
    resolverBarrio(crudo),
  ]);
  if (bloqueo) return <ErrorEnBusqueda mensaje={bloqueo} />;
  const params = leer(crudo, slug);

  // Parámetros inválidos: se muestra el error con los filtros por defecto, sin romper la pantalla.
  const validos = params instanceof ErrorBusqueda ? leer({}, slug) : params;
  if (validos instanceof ErrorBusqueda) throw validos;
  const nombreBarrio = nombreDeBarrio(barrios, slug);

  // El id del barrio se resuelve una sola vez por pedido (la lista ya está en memoria).
  const barrioId = barrios.find((b) => b.slug === slug)?.id;

  let pagina: PaginaResultados | null = null;
  let mensajeError: string | null = params instanceof ErrorBusqueda ? params.message : null;
  if (!mensajeError) {
    if (!supabaseConfigurado()) {
      mensajeError = MENSAJE_FALLA;
    } else {
      try {
        pagina = await cargarResultados(crudo, slug, validos.pagina, barrioId);
      } catch (error) {
        if (!(error instanceof ErrorBusqueda)) throw error;
        mensajeError = error.message;
      }
    }
  }

  const total = pagina?.total ?? 0;
  const hayMas = pagina ? pagina.pagina < pagina.paginas : false;
  const vacio = pagina !== null && pagina.profesionales.length === 0;

  return (
    <PanelBusqueda
      oficio={validos.oficio}
      barrio={slug}
      barrios={barrios}
      matriculados={validos.matriculados}
      orden={validos.orden}
      todaLaCiudad={validos.todaLaCiudad}
      titulo={tituloBusqueda(validos.oficio, nombreBarrio, validos.todaLaCiudad)}
      descripcion={pagina ? textoResultados(total, validos) : undefined}
      aside={<AsideBusqueda />}
    >
      {mensajeError ? <ErrorEnBusqueda mensaje={mensajeError} /> : null}
      {pagina ? (
        <>
          <RegistrarBusqueda oficio={validos.oficio} barrioId={barrioId} resultados={total} />
          {vacio ? (
            <p className="rounded-[18px] bg-superficie p-6 text-base">
              No hay profesionales con esos filtros todavía.
            </p>
          ) : (
            <ol className="flex flex-col gap-2.5 lg:gap-3">
              {pagina.profesionales.map((profesional) => (
                <li key={profesional.usuarioId}>
                  <TarjetaProfesional profesional={profesional} />
                </li>
              ))}
            </ol>
          )}
          {hayMas && pagina.pagina >= MAX_PAGINAS_ACUMULADAS ? (
            <p className="text-center text-[15px] text-texto">
              Refiná la búsqueda con los filtros para ver menos resultados.
            </p>
          ) : hayMas ? (
            <Boton
              href={urlBusqueda({
                oficio: validos.oficio,
                barrio: slug,
                matriculados: validos.matriculados,
                orden: validos.orden,
                todaLaCiudad: validos.todaLaCiudad,
                pagina: pagina.pagina + 1,
              })}
              variante="secundario"
              bloque
            >
              Ver más
            </Boton>
          ) : null}
          {/* En celular, el aviso de publicar va al final de la lista (el boceto de celular). */}
          <Link
            href="/trabajos/nuevo"
            className="flex min-h-14 items-center justify-center rounded-[18px] border-[3px] border-dashed border-texto px-4 text-center text-[15px] leading-snug font-bold text-texto no-underline lg:hidden"
          >
            ¿No querés elegir? Publicá el trabajo y que te escriban
          </Link>
        </>
      ) : null}
    </PanelBusqueda>
  );
}
