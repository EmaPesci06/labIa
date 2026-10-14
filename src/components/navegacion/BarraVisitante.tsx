import Link from "next/link";

import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";

/**
 * Barra superior para quien mira el inicio, la búsqueda o un perfil sin cuenta (LAB-23): logo a la
 * izquierda y "Ingresar" / "Crear cuenta" a la derecha, en celular y en escritorio.
 */
export function BarraVisitante() {
  return (
    <header
      data-barra-superior=""
      className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-divisor bg-superficie px-5 lg:h-[72px] lg:px-10"
    >
      <Link
        href="/"
        aria-label="LabÍA, inicio"
        className="flex min-h-11 items-center rounded-campo"
      >
        <Logo alt="" prioritario />
      </Link>
      <nav aria-label="Cuenta" className="flex items-center gap-2 lg:gap-3">
        <Boton href="/ingresar" variante="fantasma">
          Ingresar
        </Boton>
        <Boton href="/registro/cliente" variante="cliente">
          Crear cuenta
        </Boton>
      </nav>
    </header>
  );
}
