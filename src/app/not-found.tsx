import type { Metadata } from "next";

import { Boton } from "@/components/ui/Boton";
import { CintaMetrica } from "@/components/ui/cinta-metrica";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "No encontramos esta página · LabÍA" };

export default function NoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-5 px-5 py-10 text-center">
      <Logo alt="LabÍA" />
      <CintaMetrica className="w-24" />
      <h1 className="font-titulo text-[28px]">No encontramos esta página</h1>
      <p className="text-base text-texto-secundario">
        Puede que el link esté mal escrito o que la página ya no exista.
      </p>
      <Boton href="/inicio" variante="cliente" tamano="grande" bloque>
        Ir al inicio
      </Boton>
    </main>
  );
}
