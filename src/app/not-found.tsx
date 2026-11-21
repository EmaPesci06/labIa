import type { Metadata } from "next";

import { Boton } from "@/components/ui/Boton";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "No encontramos esta página · Oficio Seguro" };

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <Logo alt="Oficio Seguro" />
      <div aria-hidden className="w-24 corte-cupon" />
      <h1 className="font-titulo text-[28px]">No encontramos esta página</h1>
      <p className="text-base text-texto">
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <Boton href="/inicio" variante="cliente" tamano="grande" bloque>
        Ir al inicio
      </Boton>
    </main>
  );
}
