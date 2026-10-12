import { ChevronRight, MapPin, Search, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Boton } from "@/components/ui/Boton";
import { CintaBienvenida } from "@/components/ui/cinta-metrica";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "LabÍA · Oficios de confianza en Mar del Plata",
  description:
    "Encontrá gasistas, electricistas, cerrajeros y más en tu barrio. O conseguí trabajo con tu oficio.",
};

const OFICIOS = "Carpintería · Plomería · Cerrajería · Gas · Pintura · Mecánica · Electricidad";

const PASOS = [
  {
    titulo: "Buscá por oficio y barrio",
    texto: "O publicá lo que necesitás y los profesionales de tu zona se postulan.",
  },
  {
    titulo: "Mirá perfiles verificados",
    texto: "Fotos de trabajos, reseñas de vecinos, matrícula y antecedentes revisados.",
  },
  {
    titulo: "Hablá por WhatsApp",
    texto: "Acordás presupuesto, seña y horario directo con el profesional.",
  },
] as const;

function EtiquetaCiudad({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 font-mono text-[13px] font-semibold tracking-[0.4px] text-texto-secundario uppercase",
        className,
      )}
    >
      <MapPin aria-hidden strokeWidth={2} className="size-4" />
      Mar del Plata
    </p>
  );
}

/**
 * Bienvenida (LAB-16): "Main" (celular) y "Desk-Bienvenida" (escritorio) del prototipo.
 * Es estática: si ya hay sesión, `proxy.ts` redirige a cada rol a su inicio antes de llegar acá.
 */
export default function Bienvenida() {
  return (
    <>
      <SaltarAlContenido />
      <header className="flex items-center justify-between gap-6 px-6 pt-7 lg:border-b lg:border-divisor lg:bg-superficie lg:px-10 lg:py-[18px]">
        <Link
          href="/"
          aria-label="LabÍA, inicio"
          className="inline-flex min-h-11 items-center rounded-campo"
        >
          <Logo alt="" prioritario />
        </Link>
        <EtiquetaCiudad className="lg:hidden" />
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/ingresar"
            className="inline-flex min-h-11 items-center text-[15px] font-bold text-azul"
          >
            Ingresar
          </Link>
          <Boton href="/registro/cliente" variante="cliente">
            Crear cuenta
          </Boton>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-7 px-6 pt-7 pb-8 focus:outline-none lg:gap-20 lg:px-10 lg:pt-[72px] lg:pb-14"
      >
        <section className="flex flex-1 flex-col gap-7 lg:flex-none lg:flex-row lg:items-center lg:gap-14">
          <div className="flex flex-col gap-7 lg:flex-[999_1_560px] lg:gap-[22px]">
            <EtiquetaCiudad className="hidden lg:flex lg:text-[15px]" />
            <div className="mt-2 flex flex-col gap-3.5 lg:mt-0 lg:gap-[22px]">
              <h1 className="font-titulo text-[40px] leading-[1.05] lg:text-[64px] lg:leading-[1.02]">
                Oficios de confianza, cerca tuyo.
              </h1>
              <p className="max-w-[560px] text-[17px] leading-[1.45] text-texto-secundario lg:text-xl lg:leading-normal">
                Encontrá gasistas, electricistas, cerrajeros y más en tu barrio.{" "}
                <span className="lg:hidden">O conseguí trabajo con tu oficio.</span>
                <span className="hidden lg:inline">
                  Todos con identidad y antecedentes verificados.
                </span>
              </p>
            </div>
            <div className="flex max-w-[640px] flex-col gap-2.5 lg:gap-3">
              <CintaBienvenida className="lg:h-7" />
              <p className="font-mono text-xs leading-[1.7] font-semibold tracking-[0.6px] text-texto-secundario uppercase lg:text-[13px]">
                {OFICIOS}
              </p>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 lg:mt-0 lg:flex-[1_1_360px] lg:gap-3.5">
            <h2 className="text-[15px] font-bold text-texto-secundario">¿Qué querés hacer?</h2>
            <Link
              href="/registro/cliente"
              className="flex items-center gap-3.5 rounded-[18px] bg-azul p-[18px] text-sobre-azul lg:flex-col lg:items-stretch lg:gap-1.5 lg:rounded-[20px] lg:p-6"
            >
              <Search aria-hidden strokeWidth={2} className="size-7 shrink-0 lg:hidden" />
              <span className="flex flex-1 flex-col gap-0.5 lg:flex-none lg:gap-1.5">
                <span className="text-lg font-bold lg:text-[22px]">Quiero contratar</span>
                <span className="text-sm opacity-80 lg:text-[15px] lg:leading-[1.4]">
                  <span className="lg:hidden">Buscá profesionales o publicá un trabajo</span>
                  <span className="hidden lg:inline">
                    Buscá profesionales o publicá un trabajo y que ellos te escriban.
                  </span>
                </span>
              </span>
              <ChevronRight aria-hidden strokeWidth={2} className="size-5 shrink-0 lg:hidden" />
            </Link>
            <Link
              href="/registro/profesional"
              className="flex items-center gap-3.5 rounded-[18px] border-2 border-naranja-accion bg-superficie p-[18px] text-texto lg:flex-col lg:items-stretch lg:gap-1.5 lg:rounded-[20px] lg:p-6"
            >
              <Wrench
                aria-hidden
                strokeWidth={2}
                className="size-7 shrink-0 text-naranja-accion lg:hidden"
              />
              <span className="flex flex-1 flex-col gap-0.5 lg:flex-none lg:gap-1.5">
                <span className="text-lg font-bold lg:text-[22px]">Ofrezco mis servicios</span>
                <span className="text-sm text-texto-secundario lg:text-[15px] lg:leading-[1.4]">
                  <span className="lg:hidden">Mostrá tu oficio y encontrá trabajos</span>
                  <span className="hidden lg:inline">
                    Mostrá tu oficio, conseguí clientes y postulate a trabajos de tu zona.
                  </span>
                </span>
              </span>
              <ChevronRight
                aria-hidden
                strokeWidth={2}
                className="size-5 shrink-0 text-naranja-accion lg:hidden"
              />
            </Link>
            <p className="pt-1.5 text-center text-[15px] text-texto-secundario lg:hidden">
              ¿Ya tenés cuenta?{" "}
              <Link
                href="/ingresar"
                className="inline-block py-3 font-bold text-azul underline underline-offset-2"
              >
                Ingresar
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="como-funciona" className="hidden flex-col gap-7 lg:flex">
          <h2 id="como-funciona" className="font-titulo text-4xl">
            Cómo funciona
          </h2>
          <ol className="grid grid-cols-3 gap-5">
            {PASOS.map((paso, i) => (
              <li
                key={paso.titulo}
                className="flex flex-col gap-2.5 rounded-[18px] bg-superficie p-6"
              >
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full bg-azul-suave font-extrabold text-sobre-azul-suave"
                >
                  {i + 1}
                </span>
                <span className="text-lg font-bold">{paso.titulo}</span>
                <span className="text-[15px] leading-normal text-texto-secundario">
                  {paso.texto}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="seguridad"
          className="hidden items-center gap-8 rounded-3xl bg-azul p-10 text-sobre-azul lg:flex"
        >
          <div className="flex flex-1 flex-col gap-2.5">
            <h2 id="seguridad" className="font-titulo text-[32px]">
              Tu seguridad primero
            </h2>
            <p className="text-base leading-normal opacity-80">
              Cada profesional presenta DNI y certificado de antecedentes, y acepta nuestras normas
              de seguridad antes de publicar su perfil.
            </p>
          </div>
          <ul className="flex flex-1 flex-wrap gap-2.5">
            {["Identidad verificada", "Sin antecedentes", "Matriculado", "Normas aceptadas"].map(
              (insignia) => (
                <li
                  key={insignia}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-[15px] font-bold",
                    insignia === "Matriculado"
                      ? "bg-naranja-suave text-sobre-naranja-suave"
                      : "bg-superficie text-texto",
                  )}
                >
                  {insignia}
                </li>
              ),
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
