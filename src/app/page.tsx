import type { Metadata } from "next";
import Link from "next/link";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Logo } from "@/components/ui/Logo";
import { Toldo } from "@/components/ui/Toldo";

export const metadata: Metadata = {
  title: "LabÍA · Oficios de confianza en Mar del Plata",
  description:
    "Encontrá gasistas, electricistas, cerrajeros y más en tu barrio. O conseguí trabajo con tu oficio.",
};

/**
 * Bienvenida (LAB-16, rehecha en LAB-76): bocetos `App-Bienvenida` y `Oscuro-Bienvenida`.
 * Es estática: si ya hay sesión, `proxy.ts` redirige a cada rol a su inicio antes de llegar acá.
 */
export default function Bienvenida() {
  return (
    <div className="flex flex-1 flex-col bg-encabezado text-sobre-encabezado">
      <SaltarAlContenido />
      <Toldo color="sol" alto={26} />
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 pt-3 lg:px-8 lg:pt-6">
        <Logo sobre="encabezado" className="text-[32px]" />
        <Link
          href="/ingresar"
          className="inline-flex min-h-11 items-center rounded-full border-2 border-sobre-encabezado px-4 text-[15px] font-bold text-sobre-encabezado"
        >
          Ingresar
        </Link>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col focus:outline-none lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-14 lg:px-8 lg:py-12"
      >
        <div className="flex flex-1 flex-col px-5 pt-[22px] pb-6 lg:p-0">
          <span className="text-[15px] font-bold tracking-[0.08em] uppercase">Mar del Plata</span>
          <h1 className="mt-1.5 font-titulo text-[50px] leading-[0.98] lg:text-[64px]">
            Oficios de confianza, cerca tuyo.
          </h1>
          <p className="mt-3.5 text-lg leading-[1.4] lg:text-xl">
            Todos con identidad y antecedentes verificados.
          </p>
        </div>

        <section
          aria-label="Crear cuenta"
          className="mt-auto flex flex-col gap-3 rounded-t-hoja bg-fondo px-5 pt-[22px] pb-4 text-texto lg:mt-0 lg:rounded-hoja lg:p-7"
        >
          <Link
            href="/registro/cliente"
            className="flex flex-col gap-1 rounded-tarjeta bg-superficie px-[18px] py-4 text-texto"
          >
            <span className="font-titulo text-2xl leading-[1.1]">Necesito un profesional</span>
            <span className="text-base leading-[1.35]">
              Buscá profesionales o publicá un trabajo y que ellos te escriban.
            </span>
          </Link>
          <Link
            href="/registro/profesional"
            className="flex flex-col gap-1 rounded-tarjeta bg-sol px-[18px] py-4 text-sobre-sol"
          >
            <span className="font-titulo text-2xl leading-[1.1]">Ofrezco mis servicios</span>
            <span className="text-base leading-[1.35]">
              Mostrá tu oficio, conseguí clientes y postulate a trabajos de tu zona.
            </span>
          </Link>
          <Link
            href="/inicio"
            className="flex min-h-12 items-center justify-center text-base font-bold text-texto underline decoration-2 underline-offset-4"
          >
            Primero quiero mirar
          </Link>
          <nav aria-label="Legales" className="flex justify-center gap-5 text-sm text-texto">
            <Link
              href="/normas"
              className="flex min-h-11 items-center underline underline-offset-2"
            >
              Normas
            </Link>
            <Link
              href="/terminos"
              prefetch={false}
              className="flex min-h-11 items-center underline underline-offset-2"
            >
              Términos
            </Link>
            <Link
              href="/privacidad"
              prefetch={false}
              className="flex min-h-11 items-center underline underline-offset-2"
            >
              Privacidad
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}
