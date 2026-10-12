import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SelectorTema } from "@/components/SelectorTema";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

import { MuestraComponentes } from "./MuestraComponentes";

export const metadata: Metadata = {
  title: "Componentes · LabÍA",
  robots: { index: false, follow: false },
};

function Panel({ tema }: { tema: "claro" | "dark" }) {
  const id = tema === "claro" ? "panel-claro" : "panel-oscuro";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={cn(tema, "rounded-hoja border border-borde bg-fondo p-5 text-texto lg:p-7")}
    >
      <h2 id={`${id}-titulo`} className="mb-5 font-titulo text-2xl">
        {tema === "claro" ? "Modo claro" : "Modo oscuro"}
      </h2>
      <MuestraComponentes />
    </section>
  );
}

/**
 * Página interna con todos los componentes de `src/components/ui` en claro y oscuro, lado a lado.
 * Solo en desarrollo: en producción es 404, salvo que se defina MOSTRAR_DEV_UI=1 (lo hace Playwright
 * para correr axe contra el build).
 */
export default function PaginaComponentes() {
  if (process.env.NODE_ENV === "production" && process.env.MOSTRAR_DEV_UI !== "1") notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Logo prioritario />
          <h1 className="font-titulo text-3xl lg:text-4xl">Componentes base</h1>
          <p className="text-texto-secundario">
            Página interna (solo en desarrollo) para revisar la biblioteca de LAB-10.
          </p>
        </div>
        <SelectorTema />
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel tema="claro" />
        <Panel tema="dark" />
      </div>
    </main>
  );
}
