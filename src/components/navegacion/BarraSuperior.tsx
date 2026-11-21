import Link from "next/link";

import { SelectorBarrio } from "@/components/busqueda/SelectorBarrio";
import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";
import type { Barrio } from "@/lib/barrios-busqueda";
import type { NavegacionRol } from "@/lib/navegacion";

import { EnlacesSuperiores } from "./EnlacesSuperiores";
import { BOTON_BARRA, FILA_BARRA } from "./estilos";
import { MenuAvatar } from "./MenuAvatar";

type Props = {
  navegacion: NavegacionRol;
  nombre: string;
  /** Solo clientes: el barrio de la cuenta, con el que se les muestra la búsqueda ("Estás en…"). */
  barrio?: { actual: string; barrios: Barrio[] };
};

/**
 * Barra superior de escritorio (desde `lg`): fondo `superficie`, sin borde. Logo, secciones y, a la
 * derecha, el botón principal y el avatar con su menú. El contenido va centrado a 1200 px, igual
 * que las pantallas (boceto `App-Escritorio`). En celular no se muestra.
 */
export function BarraSuperior({ navegacion, nombre, barrio }: Props) {
  return (
    <header data-barra-superior="" className="hidden shrink-0 bg-superficie lg:block">
      <div className={FILA_BARRA}>
        <Link
          href="/inicio"
          aria-label="LabÍA, inicio"
          className="flex min-h-11 items-center rounded-xl"
        >
          <Logo alt="" />
        </Link>
        <div className="flex-1">
          <EnlacesSuperiores destinos={navegacion.escritorio} />
        </div>
        {barrio ? (
          <SelectorBarrio
            barrios={barrio.barrios}
            valor={barrio.actual}
            ruta="/buscar"
            prefijo="Estás en"
            borde
          />
        ) : null}
        <Boton href={navegacion.accion.href} className={BOTON_BARRA}>
          {navegacion.accion.etiqueta}
        </Boton>
        <MenuAvatar nombre={nombre} />
      </div>
    </header>
  );
}
