import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PanelBusqueda } from "@/components/busqueda/PanelBusqueda";
import { RegistrarBusqueda } from "@/components/busqueda/RegistrarBusqueda";
import { TarjetaPublicar } from "@/components/busqueda/TarjetaPublicar";
import { TarjetaProfesional } from "@/components/TarjetaProfesional";
import { Boton } from "@/components/ui/Boton";
import { Vacio } from "@/components/ui/Vacio";
import { elegirBarrio, nombreDeBarrio } from "@/lib/barrios";
import {
  buscarProfesionales,
  ErrorBusqueda,
  leerParametrosBusqueda,
  type PaginaResultados,
  type ParametrosBusqueda,
  type ResultadoProfesional,
} from "@/lib/busqueda";
import { barrioDeLaCuenta, obtenerBarrios } from "@/lib/busqueda-servidor";
import { urlBusqueda } from "@/lib/busqueda-url";
import { pluralOficio } from "@/lib/oficios";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

type ParametrosUrl = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<ParametrosUrl> };

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

/** Barrio efectivo: el de la URL, si no el de la cuenta, si no el Centro. */
async function resolverBarrio(crudo: ParametrosUrl) {
  const barrios = await obtenerBarrios();
  const sesion = await obtenerSesion();
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
  const crudo = await searchParams;
  const { barrios, slug } = await resolverBarrio(crudo);
  const params = leer(crudo, slug);
  const oficio = params instanceof ErrorBusqueda ? undefined : params.oficio;
  return {
    title: `${pluralOficio(oficio)} en ${nombreDeBarrio(barrios, slug)}, Mar del Plata · LabÍA`,
  };
}

/** Páginas 1..N juntas: "Ver más" agrega 20 sin perder lo que ya se veía. */
async function cargarResultados(
  crudo: ParametrosUrl,
  slug: string,
  hasta: number,
): Promise<PaginaResultados> {
  const supabase = await crearClienteServidor();
  const primera = await buscarProfesionales(supabase, { ...crudo, barrio: slug, pagina: "1" });
  const ultima = Math.min(hasta, primera.paginas);
  const siguientes = await Promise.all(
    Array.from({ length: Math.max(0, ultima - 1) }, (_, i) =>
      buscarProfesionales(supabase, { ...crudo, barrio: slug, pagina: String(i + 2) }),
    ),
  );
  const profesionales: ResultadoProfesional[] = [
    ...primera.profesionales,
    ...siguientes.flatMap((p) => p.profesionales),
  ];
  return { ...primera, profesionales, pagina: ultima };
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

function textoResultados(total: number, nombreBarrio: string, p: ParametrosBusqueda): string {
  const donde = p.todaLaCiudad ? "En toda la ciudad" : `Cerca de ${nombreBarrio}`;
  const cantidad = `${total} ${total === 1 ? "resultado" : "resultados"}`;
  const orden = p.orden === "calificacion" ? "mejor calificados primero" : "más cerca primero";
  return `${donde} · ${cantidad}, ${orden}`;
}

export default async function Buscar({ searchParams }: Props) {
  const crudo = await searchParams;
  const { barrios, slug } = await resolverBarrio(crudo);
  const params = leer(crudo, slug);

  // Parámetros inválidos: se muestra el error con los filtros por defecto, sin romper la pantalla.
  const validos = params instanceof ErrorBusqueda ? leer({}, slug) : params;
  if (validos instanceof ErrorBusqueda) throw validos;
  const nombreBarrio = nombreDeBarrio(barrios, slug);

  let pagina: PaginaResultados | null = null;
  let mensajeError: string | null = params instanceof ErrorBusqueda ? params.message : null;
  if (!mensajeError) {
    if (!supabaseConfigurado()) {
      mensajeError = MENSAJE_FALLA;
    } else {
      try {
        pagina = await cargarResultados(crudo, slug, validos.pagina);
      } catch (error) {
        if (!(error instanceof ErrorBusqueda)) throw error;
        mensajeError = error.message;
      }
    }
  }

  const total = pagina?.total ?? 0;
  const hayMas = pagina ? pagina.pagina < pagina.paginas : false;
  const vacio = pagina !== null && pagina.profesionales.length === 0;

  const encabezado = (
    <div className="flex items-center gap-1.5 lg:items-baseline lg:justify-between lg:gap-3">
      <Link
        href="/inicio"
        aria-label="Volver"
        className="-ml-2.5 flex size-11 shrink-0 items-center justify-center rounded-campo text-texto lg:hidden"
      >
        <ChevronLeft aria-hidden strokeWidth={2} className="size-[22px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between lg:gap-3">
        <h1 className="font-titulo text-2xl lg:text-[32px] lg:tracking-[-0.5px]">
          {pluralOficio(validos.oficio)}
        </h1>
        {pagina ? (
          <p className="text-sm text-texto-secundario lg:text-[15px]">
            {textoResultados(total, nombreBarrio, validos)}
          </p>
        ) : null}
      </div>
    </div>
  );

  const barrioId = barrios.find((b) => b.slug === slug)?.id;

  return (
    <PanelBusqueda
      oficio={validos.oficio}
      barrio={slug}
      barrios={barrios}
      matriculados={validos.matriculados}
      orden={validos.orden}
      todaLaCiudad={validos.todaLaCiudad}
      encabezado={encabezado}
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
            <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              {pagina.profesionales.map((profesional) => (
                <li key={profesional.usuarioId} className="flex flex-col">
                  <TarjetaProfesional profesional={profesional} className="flex-1" />
                </li>
              ))}
            </ul>
          )}
          {hayMas ? (
            <Boton
              href={urlBusqueda({
                oficio: validos.oficio,
                barrio: slug,
                matriculados: validos.matriculados,
                orden: validos.orden,
                todaLaCiudad: validos.todaLaCiudad,
                pagina: pagina.pagina + 1,
              })}
              scroll={false}
              variante="secundario"
              bloque
            >
              Ver más
            </Boton>
          ) : null}
          <div className={vacio ? undefined : "hidden lg:block"}>
            <TarjetaPublicar
              titulo="¿No encontrás a quién llamar?"
              descripcion="Publicá un trabajo y los profesionales de tu zona se postulan."
              accion="Publicar un trabajo"
              disposicion="fila"
            />
          </div>
        </>
      ) : null}
    </PanelBusqueda>
  );
}
