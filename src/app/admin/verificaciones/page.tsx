import type { Metadata } from "next";
import Link from "next/link";

import { Vacio } from "@/components/ui/Vacio";
import { cn } from "@/lib/cn";
import { haceCuanto } from "@/lib/formato";
import { nombreOficio } from "@/lib/oficios";
import { ETIQUETAS_DOCUMENTO } from "@/lib/validaciones/documentos";
import { esPestana, esperaLarga, PESTANAS, type Pestana } from "@/lib/verificacion/logica";
import { listarProfesionales, type FilaProfesional } from "@/lib/verificacion/datos";

type Props = { searchParams: Promise<{ pestana?: string }> };

export const metadata: Metadata = { title: "Verificaciones · LabÍA" };

const ESTADO_TEXTO = {
  pendiente: "pendiente",
  aprobado: "aprobado",
  rechazado: "rechazado",
} as const;

function Fila({ fila }: { fila: FilaProfesional }) {
  const nombre = [fila.nombre, fila.apellido].filter(Boolean).join(" ");
  const espera = fila.pendienteDesde;
  const enRojo = espera !== null && esperaLarga(espera);
  return (
    <li>
      <Link
        href={`/admin/verificaciones/${fila.usuarioId}`}
        className="flex min-h-[44px] flex-col gap-2.5 rounded-[18px] bg-superficie p-4 text-texto hover:bg-azul-suave lg:flex-row lg:items-center lg:justify-between lg:gap-6"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-titulo text-lg font-extrabold">{nombre}</p>
          <p className="text-sm text-texto-secundario">
            {fila.oficios.map(nombreOficio).join(" · ") || "Sin oficios cargados"}
            {fila.barrio ? ` · ${fila.barrio}` : ""}
          </p>
          <p className="text-sm text-texto-secundario">
            {fila.documentos
              .filter((d, i, todos) => todos.findIndex((x) => x.tipo === d.tipo) === i)
              .map((d) => `${ETIQUETAS_DOCUMENTO[d.tipo]} (${ESTADO_TEXTO[d.estado]})`)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm lg:flex-col lg:items-end">
          {espera ? (
            <span className={cn("font-semibold", enRojo ? "text-error" : "text-texto-secundario")}>
              Envió {haceCuanto(espera)}
              {enRojo ? " · más de 48 h" : ""}
            </span>
          ) : null}
          {fila.pendientes > 0 ? (
            <span className="rounded-full bg-naranja-suave px-2.5 py-1 text-xs font-bold text-sobre-naranja-suave">
              {fila.pendientes === 1
                ? "1 documento por revisar"
                : `${fila.pendientes} documentos por revisar`}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

/** Verificaciones de profesionales: pendientes (más viejos primero), rechazados y aprobados. */
export default async function Verificaciones({ searchParams }: Props) {
  const { pestana: valor } = await searchParams;
  const pestana: Pestana = esPestana(valor) ? valor : "pendientes";
  const filas = await listarProfesionales();
  const pendientes = filas.filter((f) => f.pestana === "pendientes").length;
  const visibles = filas.filter((f) => f.pestana === pestana);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-titulo text-[28px] font-extrabold lg:text-4xl">
          Verificaciones
          <span className="ml-3 text-lg font-semibold text-texto-secundario lg:text-xl">
            {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
          </span>
        </h1>
        <p className="text-texto-secundario">
          Revisá los documentos de cada profesional. Nadie aparece en las búsquedas hasta aprobar su
          DNI y sus antecedentes.
        </p>
      </div>

      <nav aria-label="Pestañas de verificación">
        <ul className="flex flex-wrap gap-2">
          {PESTANAS.map((p) => {
            const activa = p.valor === pestana;
            return (
              <li key={p.valor}>
                <Link
                  href={`/admin/verificaciones?pestana=${p.valor}`}
                  aria-current={activa ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold",
                    activa
                      ? "bg-azul text-sobre-azul"
                      : "border border-borde bg-superficie text-texto hover:bg-azul-suave",
                  )}
                >
                  {p.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visibles.length === 0 ? (
        <Vacio
          titulo={
            pestana === "pendientes"
              ? "No hay documentos para revisar"
              : "No hay profesionales en esta lista"
          }
          descripcion="Cuando un profesional suba sus documentos, aparece acá."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((fila) => (
            <Fila key={fila.usuarioId} fila={fila} />
          ))}
        </ul>
      )}
    </div>
  );
}
