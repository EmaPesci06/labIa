"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/cn";
import { esDestinoActivo, type Destino } from "@/lib/navegacion";
import type { RolApp } from "@/lib/sesion";

type Props = {
  destinos: readonly Destino[];
  rol: RolApp;
};

type PropsLista = Props & { esActivo: (destino: Destino) => boolean };

function Lista({ destinos, rol, esActivo }: PropsLista) {
  return (
    <ul className="flex items-center gap-7">
      {destinos.map((destino) => {
        const activo = esActivo(destino);
        return (
          <li key={destino.href}>
            <Link
              href={destino.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center text-[15px] font-semibold",
                activo
                  ? cn(
                      "underline decoration-2 underline-offset-[6px]",
                      rol === "profesional" ? "text-naranja-accion" : "text-azul",
                    )
                  : "text-texto hover:text-azul",
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

/** Links del centro de la barra superior de escritorio. */
export function EnlacesSuperiores({ destinos, rol }: Props) {
  return (
    <nav aria-label="Principal">
      <Suspense fallback={<Lista destinos={destinos} rol={rol} esActivo={() => false} />}>
        <ListaConRuta destinos={destinos} rol={rol} />
      </Suspense>
    </nav>
  );
}
