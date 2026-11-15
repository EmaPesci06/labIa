"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import { esDestinoActivo, type Destino } from "@/lib/navegacion";

import { SECCION_BARRA } from "./estilos";

type Props = {
  destinos: readonly Destino[];
};

type PropsLista = Props & { esActivo: (destino: Destino) => boolean };

function Lista({ destinos, esActivo }: PropsLista) {
  return (
    <ul className="flex items-center gap-1">
      {destinos.map((destino) => {
        const activo = esActivo(destino);
        return (
          <li key={destino.href}>
            <Link
              href={destino.href}
              aria-current={activo ? "page" : undefined}
              // La sección actual lleva la pastilla `fondo` y va en negrita (boceto App-Escritorio).
              className={cn(SECCION_BARRA, activo ? "bg-fondo font-bold" : "font-normal")}
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

/** Secciones del centro de la barra superior de escritorio. */
export function EnlacesSuperiores({ destinos }: Props) {
  return (
    <nav aria-label="Principal">
      <Suspense fallback={<Lista destinos={destinos} esActivo={() => false} />}>
        <ListaConRuta destinos={destinos} />
      </Suspense>
    </nav>
  );
}
