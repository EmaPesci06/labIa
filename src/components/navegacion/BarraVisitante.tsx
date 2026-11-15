import Link from "next/link";

import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";

import { BOTON_BARRA, FILA_BARRA } from "./estilos";

/**
 * Barra superior para quien mira el inicio, la búsqueda o un perfil sin cuenta (LAB-23): logo a la
 * izquierda y "Ingresar" / "Crear cuenta" a la derecha, en celular y en escritorio.
 */
export function BarraVisitante() {
  return (
    <header data-barra-superior="" className="shrink-0 bg-superficie">
      <div className={FILA_BARRA}>
        <Link
          href="/"
          aria-label="LabÍA, inicio"
          className="mr-auto flex min-h-11 items-center rounded-campo"
        >
          <Logo alt="" />
        </Link>
        <nav aria-label="Cuenta" className="flex items-center gap-2 lg:gap-3">
          <Boton href="/ingresar" variante="secundario" className={BOTON_BARRA}>
            Ingresar
          </Boton>
          <Boton href="/registro/cliente" className={BOTON_BARRA}>
            Crear cuenta
          </Boton>
        </nav>
      </div>
    </header>
  );
}
