import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SelectorTema } from "@/components/SelectorTema";
import { Logo } from "@/components/ui/Logo";
import { cn, TOKENS_COLOR } from "@/lib/cn";

import { ValorToken } from "./ValorToken";

export const metadata: Metadata = {
  title: "Paleta · LabÍA",
  robots: { index: false, follow: false },
};

// Clases escritas completas para que Tailwind las genere (no se pueden armar con template strings).
const MUESTRA: Record<(typeof TOKENS_COLOR)[number], string> = {
  azul: "bg-azul",
  "azul-presionado": "bg-azul-presionado",
  "sobre-azul": "bg-sobre-azul",
  "azul-suave": "bg-azul-suave",
  "sobre-azul-suave": "bg-sobre-azul-suave",
  "naranja-marca": "bg-naranja-marca",
  "naranja-accion": "bg-naranja-accion",
  "sobre-naranja": "bg-sobre-naranja",
  "naranja-suave": "bg-naranja-suave",
  "sobre-naranja-suave": "bg-sobre-naranja-suave",
  exito: "bg-exito",
  "sobre-exito": "bg-sobre-exito",
  "exito-suave": "bg-exito-suave",
  "sobre-exito-suave": "bg-sobre-exito-suave",
  acento: "bg-acento",
  fondo: "bg-fondo",
  superficie: "bg-superficie",
  "superficie-elevada": "bg-superficie-elevada",
  texto: "bg-texto",
  "texto-secundario": "bg-texto-secundario",
  "texto-terciario": "bg-texto-terciario",
  borde: "bg-borde",
  divisor: "bg-divisor",
  foco: "bg-foco",
  cinta: "bg-cinta",
  "cinta-marcas": "bg-cinta-marcas",
};

const PARES = [
  { nombre: "Acción cliente", clases: "bg-azul text-sobre-azul" },
  { nombre: "Acción profesional", clases: "bg-naranja-accion text-sobre-naranja" },
  { nombre: "Éxito / WhatsApp", clases: "bg-exito text-sobre-exito" },
  { nombre: "Identidad verificada", clases: "bg-azul-suave text-sobre-azul-suave" },
  { nombre: "Matriculado", clases: "bg-naranja-suave text-sobre-naranja-suave" },
  { nombre: "Contratado", clases: "bg-exito-suave text-sobre-exito-suave" },
];

function Panel({ tema }: { tema: "claro" | "dark" }) {
  const titulo = tema === "claro" ? "Modo claro" : "Modo oscuro";
  return (
    <section
      aria-labelledby={`titulo-${tema}`}
      className={cn(tema, "rounded-tarjeta border border-borde bg-fondo p-4 text-texto lg:p-6")}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`titulo-${tema}`} className="font-titulo text-2xl">
          {titulo}
        </h2>
        <Logo className="h-8" alt="" />
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TOKENS_COLOR.map((token) => (
          <li
            key={token}
            className="flex items-center gap-2 rounded-campo border border-divisor bg-superficie p-2"
          >
            <span
              aria-hidden
              className={cn("size-9 shrink-0 rounded-lg border border-borde", MUESTRA[token])}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{token}</span>
              <ValorToken variable={`--color-${token}`} />
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 font-mono text-sm font-semibold tracking-[0.4px] text-texto-secundario uppercase">
        Texto sobre color
      </h3>
      <div className="flex flex-wrap gap-2">
        {PARES.map((par) => (
          <span
            key={par.nombre}
            className={cn("rounded-full px-3 py-1.5 text-sm font-bold", par.clases)}
          >
            {par.nombre}
          </span>
        ))}
      </div>

      <div className="mt-6 space-y-1 rounded-tarjeta bg-superficie p-4">
        <p className="text-texto">Texto principal sobre superficie.</p>
        <p className="text-texto-secundario">Texto secundario: descripciones y etiquetas.</p>
        <p className="text-texto-terciario">Texto terciario: ayudas.</p>
        <p className="text-acento underline">Enlace con acento</p>
      </div>
      <div className="mt-2 rounded-tarjeta bg-superficie-elevada p-4 text-sm">
        Superficie elevada (hojas y menús en oscuro).
      </div>
    </section>
  );
}

export default function PaginaPaleta() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Logo prioritario />
          <h1 className="font-titulo text-3xl lg:text-4xl">Paleta y tipografías</h1>
          <p className="text-texto-secundario">
            Página interna (solo en desarrollo) para revisar los tokens de la guía §5.
          </p>
        </div>
        <SelectorTema />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel tema="claro" />
        <Panel tema="dark" />
      </div>

      <section aria-labelledby="titulo-tipografias" className="space-y-4">
        <h2 id="titulo-tipografias" className="font-titulo text-2xl">
          Tipografías
        </h2>
        <div className="space-y-4 rounded-tarjeta border border-borde bg-superficie p-4 lg:p-6">
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.4px] text-texto-terciario uppercase">
              Archivo 800 · font-stretch 118 % · font-titulo
            </p>
            <p className="font-titulo text-4xl">Buscá tu plomero de confianza</p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.4px] text-texto-terciario uppercase">
              Atkinson Hyperlegible Next 400 y 700 · font-texto
            </p>
            <p className="text-lg">
              Publicá tu trabajo y elegí entre profesionales verificados de tu barrio.
            </p>
            <p className="text-lg font-bold">Identidad y antecedentes revisados a mano.</p>
          </div>
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.4px] text-texto-terciario uppercase">
              IBM Plex Mono 500 y 600 · font-mono
            </p>
            <p className="font-mono text-sm font-medium tracking-[0.4px] uppercase">
              Gas · La Perla · hace 20 min · a 0,8 km
            </p>
            <p className="font-mono text-sm font-semibold">Paso 2 de 3</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-marca" className="space-y-4">
        <h2 id="titulo-marca" className="font-titulo text-2xl">
          Logo y cinta
        </h2>
        <div className="flex flex-wrap items-center gap-6 rounded-tarjeta border border-borde bg-superficie p-4 lg:p-6">
          <Logo className="h-12" />
          <Logo variante="icono" className="size-12" />
          <div
            aria-hidden
            className="h-3 w-40 origin-left animate-cinta rounded-xs border-r-3 border-cinta-marcas bg-cinta"
          />
        </div>
      </section>
    </main>
  );
}
