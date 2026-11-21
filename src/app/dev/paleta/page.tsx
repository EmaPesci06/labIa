import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SelectorTema } from "@/components/SelectorTema";
import { Logo } from "@/components/ui/Logo";
import { cn, TOKENS_COLOR } from "@/lib/cn";

import { ValorToken } from "./ValorToken";

export const metadata: Metadata = {
  title: "Paleta · Oficio Seguro",
  robots: { index: false, follow: false },
};

// Clases escritas completas para que Tailwind las genere (no se pueden armar con template strings).
const MUESTRA: Record<(typeof TOKENS_COLOR)[number], string> = {
  fondo: "bg-fondo",
  superficie: "bg-superficie",
  campo: "bg-campo",
  texto: "bg-texto",
  "texto-suave": "bg-texto-suave",
  borde: "bg-borde",
  accion: "bg-accion",
  "sobre-accion": "bg-sobre-accion",
  encabezado: "bg-encabezado",
  "sobre-encabezado": "bg-sobre-encabezado",
  destacado: "bg-destacado",
  "sobre-destacado": "bg-sobre-destacado",
  adorno: "bg-adorno",
  error: "bg-error",
  equipo: "bg-equipo",
  velo: "bg-velo",
  foco: "bg-foco",
};

const PARES = [
  { nombre: "Acción · botón principal", clases: "bg-accion text-sobre-accion" },
  { nombre: "Encabezado", clases: "bg-encabezado text-sobre-encabezado" },
  { nombre: "Elegido · chip y dato clave", clases: "bg-destacado text-sobre-destacado" },
  { nombre: "Equipo · panel de admin", clases: "bg-equipo text-sobre-encabezado" },
  { nombre: "Sin elegir · chip", clases: "bg-superficie text-texto" },
];

function Panel({ tema }: { tema: "claro" | "dark" }) {
  const titulo = tema === "claro" ? "Modo claro" : "Modo oscuro";
  return (
    <section
      aria-labelledby={`titulo-${tema}`}
      className={cn(tema, "rounded-3xl border-2 border-texto bg-fondo p-4 text-texto lg:p-6")}
    >
      <h2 id={`titulo-${tema}`} className="mb-4 font-titulo text-2xl">
        {titulo}
      </h2>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TOKENS_COLOR.map((token) => (
          <li
            key={token}
            className="flex items-center gap-2 rounded-xl border-2 border-texto bg-superficie p-2"
          >
            <span
              aria-hidden
              className={cn("size-9 shrink-0 rounded-lg border-2 border-texto", MUESTRA[token])}
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{token}</span>
              <ValorToken variable={`--color-${token}`} />
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 mb-2 text-sm font-bold tracking-[0.4px] text-texto uppercase">
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

      <div className="mt-6 space-y-1 rounded-3xl bg-superficie p-4">
        <p className="text-texto">Texto principal sobre superficie.</p>
        <p className="font-bold text-texto underline">Enlace de texto: negrita en texto.</p>
        <p className="font-bold text-error">Error: revisá este campo.</p>
        <p className="flex items-center gap-2 text-sm">
          <span aria-hidden className="inline-block size-4 rounded-full bg-adorno" />
          Adorno: solo adorno, nunca texto.
        </p>
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
          <Logo className="text-4xl" />
          <h1 className="font-titulo text-3xl lg:text-4xl">Paleta y tipografías</h1>
          <p className="text-texto">
            Página interna (solo en desarrollo) para revisar los tokens de &quot;Verano en la
            costa&quot;.
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
        <div className="space-y-4 rounded-3xl border-2 border-texto bg-superficie p-4 lg:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.4px] text-texto uppercase">
              Archivo 800 · font-titulo
            </p>
            <p className="font-titulo text-4xl">Buscá tu plomero de confianza</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.4px] text-texto uppercase">
              Archivo 400 y 600 · font-texto
            </p>
            <p className="text-lg">
              Publicá tu trabajo y elegí entre profesionales verificados de tu barrio.
            </p>
            <p className="text-lg font-bold">Identidad y antecedentes revisados a mano.</p>
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.4px] text-texto uppercase">
              Etiquetas · Archivo Narrow 700 en mayúsculas · font-etiqueta
            </p>
            <p className="font-etiqueta text-sm">Gas · La Perla · hace 20 min · a 0,8 km</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-marca" className="space-y-4">
        <h2 id="titulo-marca" className="font-titulo text-2xl">
          Logo
        </h2>
        <div className="flex flex-wrap items-center gap-6 rounded-3xl border-2 border-texto bg-superficie p-4 lg:p-6">
          <div className="rounded-xl bg-fondo p-4">
            <Logo className="text-4xl" />
          </div>
          <div className="rounded-xl bg-encabezado p-4">
            <Logo className="text-4xl" sobre="encabezado" />
          </div>
          <Logo variante="icono" />
        </div>
      </section>
    </main>
  );
}
