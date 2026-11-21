import type { Metadata } from "next";

import { SelectorBarrio } from "@/components/busqueda/SelectorBarrio";
import { GrillaOficios } from "@/components/inicio/GrillaOficios";
import { ProblemasFrecuentes } from "@/components/inicio/ProblemasFrecuentes";
import { ResultadoProblema } from "@/components/inicio/ResultadoProblema";
import { Logo } from "@/components/ui/Logo";
import { elegirBarrio, nombreDeBarrio, type Barrio } from "@/lib/barrios-busqueda";
import {
  buscarProfesionales,
  ErrorBusqueda,
  type PaginaResultados,
  type ResultadoProfesional,
} from "@/lib/busqueda";
import { barrioDeLaCuenta, obtenerBarrios } from "@/lib/busqueda-servidor";
import { OFICIOS_ORDENADOS, type Oficio } from "@/lib/oficios";
import { PROBLEMA_POR_DEFECTO, problemaPorSlug } from "@/lib/problemas";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Buscá un profesional en Mar del Plata · Oficio Seguro",
  description:
    "Gas, electricidad, plomería, cerrajería, carpintería, pintura y mecánica: profesionales verificados cerca de tu barrio.",
};

type ParametrosUrl = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<ParametrosUrl> };

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

/**
 * Búsqueda de cada oficio cerca del barrio, con la misma consulta de `/buscar` (LAB-22). De ahí salen
 * los números de las carpas y los profesionales del problema elegido. `null` si no hay base de datos.
 */
async function cargarOficios(
  barrio: string,
  barrios: readonly Barrio[],
): Promise<Map<Oficio, PaginaResultados | null> | null> {
  if (!supabaseConfigurado()) return null;
  const supabase = await crearClienteServidor();
  const barrioId = barrios.find((b) => b.slug === barrio)?.id;
  const entradas = await Promise.all(
    OFICIOS_ORDENADOS.map(async (oficio): Promise<[Oficio, PaginaResultados | null]> => {
      try {
        return [oficio, await buscarProfesionales(supabase, { oficio, barrio }, barrioId)];
      } catch (error) {
        // Un oficio que falla no tira toda la pantalla: esa carpa sale sin número.
        if (error instanceof ErrorBusqueda) return [oficio, null];
        throw error;
      }
    }),
  );
  return new Map(entradas);
}

/**
 * Inicio del cliente (boceto `App-Inicio` en celular y `App-Escritorio` en escritorio, con el mismo
 * marcado y clases por tamaño). También se ve sin cuenta: con la barra de visitante. En escritorio ya
 * no redirige a `/buscar`: el inicio muestra el problema elegido a la derecha.
 */
export default async function Inicio({ searchParams }: Props) {
  const crudo = await searchParams;
  // Independientes entre sí: juntas (LAB-88).
  const [sesion, barrios] = await Promise.all([obtenerSesion(), obtenerBarrios()]);
  const barrio = elegirBarrio(
    barrios,
    primero(crudo.barrio)?.trim() || undefined,
    await barrioDeLaCuenta(sesion),
  );
  const problema = problemaPorSlug(primero(crudo.problema)) ?? PROBLEMA_POR_DEFECTO;

  const oficios = await cargarOficios(barrio, barrios);
  const conteos: Partial<Record<Oficio, number>> | null = oficios
    ? Object.fromEntries(
        [...oficios.entries()].flatMap(([oficio, pagina]) =>
          pagina ? [[oficio, pagina.total]] : [],
        ),
      )
    : null;
  const paginaDelProblema = oficios?.get(problema.oficio) ?? null;
  const profesionales: ResultadoProfesional[] = paginaDelProblema?.profesionales ?? [];

  return (
    <>
      <section
        data-encabezado="turquesa"
        aria-labelledby="que-se-rompio"
        className="flex flex-col gap-5 rounded-b-[28px] bg-encabezado px-5 pt-4 pb-6 text-sobre-encabezado lg:flex-row lg:items-start lg:gap-10 lg:rounded-b-[40px] lg:pt-12 lg:pb-14"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Logo alt="Oficio Seguro" sobre="encabezado" />
            <SelectorBarrio barrios={barrios} valor={barrio} ruta="/inicio" />
          </div>
          <div className="flex flex-col gap-3">
            <h1
              id="que-se-rompio"
              className="font-titulo text-[44px] leading-none font-extrabold lg:text-[72px] lg:leading-[0.95]"
            >
              ¿Qué se rompió?
            </h1>
            <p className="hidden max-w-[34rem] text-lg lg:block">
              Tocá lo que más se parezca. Te decimos qué oficio lo arregla y quién está cerca de tu
              barrio.
            </p>
          </div>
          <ProblemasFrecuentes problemaActual={problema.slug} barrio={barrio} />
        </div>

        <div className="flex w-full flex-col lg:w-[380px] lg:shrink-0">
          <ResultadoProblema
            oficio={problema.oficio}
            barrio={barrio}
            profesionales={profesionales}
            total={paginaDelProblema?.total ?? null}
          />
        </div>
      </section>

      <section
        aria-labelledby="ya-sabes"
        className="flex flex-col gap-3 pt-6 pb-8 lg:pt-10 lg:pb-12"
      >
        <h2
          id="ya-sabes"
          className="font-titulo text-2xl leading-tight font-extrabold lg:text-[32px]"
        >
          ¿Ya sabés a quién buscás?
        </h2>
        <GrillaOficios barrio={barrio} conteos={conteos} />
        <p className="text-sm lg:hidden">
          El número es cuántos verificados hay a menos de 5&nbsp;km.
        </p>
        <p className="hidden text-[15px] lg:block">
          Todos pasaron la revisión de identidad y antecedentes. El número es cuántos hay a menos de
          5&nbsp;km de {nombreDeBarrio(barrios, barrio)}.
        </p>
      </section>
    </>
  );
}
