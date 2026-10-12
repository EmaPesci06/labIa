"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import { esDestinoActivo, type Destino } from "@/lib/navegacion";
import type { RolApp } from "@/lib/sesion";

import { IconoDestino } from "./iconos";

type Props = {
  destinos: readonly Destino[];
  rol: RolApp;
};

type PropsLista = Props & { esActivo: (destino: Destino) => boolean };

function Lista({ destinos, rol, esActivo }: PropsLista) {
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
                "flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-campo text-xs",
                activo
                  ? cn("font-bold", rol === "profesional" ? "text-naranja-accion" : "text-azul")
                  : "font-semibold text-texto-secundario",
              )}
            >
              <IconoDestino icono={destino.icono} className="size-[22px]" />
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
 * Barra inferior de celular (< 1024 px): 3 ítems, 64 px de alto más el área segura de abajo.
 * El ítem activo va en azul (cliente) o naranja de acción (profesional) con `aria-current="page"`.
 * `data-barra-inferior` la usa globals.css para dejarle lugar al final de la página.
 */
export function BarraInferior({ destinos, rol }: Props) {
  return (
    <nav
      aria-label="Navegación"
      data-barra-inferior=""
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-divisor bg-superficie px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:hidden"
    >
      {/* useSearchParams necesita Suspense; mientras tanto se dibuja sin ítem activo. */}
      <Suspense fallback={<Lista destinos={destinos} rol={rol} esActivo={() => false} />}>
        <ListaConRuta destinos={destinos} rol={rol} />
      </Suspense>
    </nav>
  );
}
