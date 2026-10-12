import Link from "next/link";

import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";
import type { NavegacionRol } from "@/lib/navegacion";
import type { RolApp } from "@/lib/sesion";

import { EnlacesSuperiores } from "./EnlacesSuperiores";
import { MenuAvatar } from "./MenuAvatar";

type Props = {
  navegacion: NavegacionRol;
  rol: RolApp;
  nombre: string;
};

/**
 * Barra superior de escritorio (≥ 1024 px), 72 px: logo, destinos en el centro y a la derecha
 * el botón principal más el avatar con su menú. En celular no se muestra (`hidden lg:flex`).
 */
export function BarraSuperior({ navegacion, rol, nombre }: Props) {
  return (
    <header
      data-barra-superior=""
      className="hidden h-[72px] shrink-0 items-center justify-between gap-6 border-b border-divisor bg-superficie px-10 lg:flex"
    >
      <Link
        href="/inicio"
        aria-label="LabÍA, inicio"
        className="flex min-h-11 items-center rounded-campo"
      >
        <Logo alt="" prioritario />
      </Link>
      <EnlacesSuperiores destinos={navegacion.escritorio} rol={rol} />
      <div className="flex items-center gap-4">
        <Boton
          href={navegacion.accion.href}
          variante={rol === "profesional" ? "profesional" : "cliente"}
        >
          {navegacion.accion.etiqueta}
        </Boton>
        <MenuAvatar nombre={nombre} rol={rol} />
      </div>
    </header>
  );
}
