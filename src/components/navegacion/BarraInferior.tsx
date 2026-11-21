"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import { esDestinoActivo, type Destino } from "@/lib/navegacion";

type Props = {
  destinos: readonly Destino[];
};

type PropsLista = Props & { esActivo: (destino: Destino) => boolean };

function Lista({ destinos, esActivo }: PropsLista) {
  return (
    <ul className="contents">
      {destinos.map((destino) => {
        const activo = esActivo(destino);
        return (
          <li key={destino.href} className="flex">
            <Link
              href={destino.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex min-h-12 w-full items-center justify-center rounded-xl text-[15px] text-texto",
                // Sección actual: pastilla `fondo` de radio 16, en negrita (boceto App-Buscar).
                activo ? "bg-fondo font-bold" : "font-normal",
              )}
            >
              {destino.etiqueta}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ListaConRuta(props: Props) {
  const ruta = usePathname();
  const vista = useSearchParams().get("vista");
  return <Lista {...props} esActivo={(destino) => esDestinoActivo(destino, ruta, vista)} />;
}

/**
 * Barra inferior de celular (< `lg`): 3 secciones de texto sobre fondo `superficie`, sin borde ni
 * sombra. Alto 68 px más el área segura de abajo; el contenido ocupa los 68 px.
 * `data-barra-inferior` la usa globals.css para dejarle lugar al final de la página.
 */
export function BarraInferior({ destinos }: Props) {
  return (
    <nav
      aria-label="Navegación"
      data-barra-inferior=""
      className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(68px+env(safe-area-inset-bottom))] grid-cols-3 items-center bg-superficie px-3 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden"
    >
      {/* useSearchParams necesita Suspense; mientras tanto se dibuja sin ítem activo. */}
      <Suspense fallback={<Lista destinos={destinos} esActivo={() => false} />}>
        <ListaConRuta destinos={destinos} />
      </Suspense>
    </nav>
  );
}
