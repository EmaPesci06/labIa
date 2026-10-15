import type { Metadata } from "next";
import Link from "next/link";

import { FilaReporte } from "@/components/admin/reportes/FilaReporte";
import { FilaResenaBaja } from "@/components/admin/reportes/FilaResenaBaja";
import { Vacio } from "@/components/ui/Vacio";
import { cn } from "@/lib/cn";
import { listarReportes, listarResenasBajas } from "@/lib/admin/reportes-datos";

type Props = { searchParams: Promise<{ pestana?: string }> };

export const metadata: Metadata = { title: "Reportes y moderación · LabÍA" };

type PestanaReportes = "abiertos" | "en_revision" | "resueltos" | "resenas_bajas";

const PESTANAS: { valor: PestanaReportes; etiqueta: string }[] = [
  { valor: "abiertos", etiqueta: "Abiertos" },
  { valor: "en_revision", etiqueta: "En revisión" },
  { valor: "resueltos", etiqueta: "Resueltos" },
  { valor: "resenas_bajas", etiqueta: "Reseñas 1-2★" },
];

function esPestanaValida(valor: string | undefined): valor is PestanaReportes {
  return PESTANAS.some((p) => p.valor === valor);
}

export default async function PaginaReportesAdmin({ searchParams }: Props) {
  const { pestana: valor } = await searchParams;
  const pestana: PestanaReportes = esPestanaValida(valor) ? valor : "abiertos";

  const [reportes, resenasBajas] = await Promise.all([listarReportes(), listarResenasBajas()]);

  const abiertos = reportes.filter((r) => r.estado === "abierto");
  const enRevision = reportes.filter((r) => r.estado === "en_revision");
  const resueltos = reportes.filter((r) => r.estado === "resuelto");

  const conteos: Record<PestanaReportes, number> = {
    abiertos: abiertos.length,
    en_revision: enRevision.length,
    resueltos: resueltos.length,
    resenas_bajas: resenasBajas.length,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-titulo text-[28px] font-extrabold lg:text-4xl">
          Reportes y moderación
          <span className="ml-3 text-lg font-semibold text-texto-secundario lg:text-xl">
            {abiertos.length} {abiertos.length === 1 ? "abierto" : "abiertos"}
          </span>
        </h1>
        <p className="text-texto-secundario">
          Revisá reportes de perfiles, trabajos o reseñas, y moderá reseñas bajas o cuentas
          infractoras.
        </p>
      </div>

      <nav aria-label="Pestañas de reportes">
        <ul className="flex flex-wrap gap-2">
          {PESTANAS.map((p) => {
            const activa = p.valor === pestana;
            const conteo = conteos[p.valor];
            return (
              <li key={p.valor}>
                <Link
                  href={`/admin/reportes?pestana=${p.valor}`}
                  aria-current={activa ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                    activa
                      ? "bg-azul text-sobre-azul"
                      : "border border-borde bg-superficie text-texto hover:bg-azul-suave",
                  )}
                >
                  <span>{p.etiqueta}</span>
                  {conteo > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        activa
                          ? "bg-white/20 text-white"
                          : "bg-superficie-elevada text-texto-secundario",
                      )}
                    >
                      {conteo}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Contenido de la pestaña */}
      {pestana === "abiertos" ? (
        abiertos.length === 0 ? (
          <Vacio
            titulo="No hay reportes abiertos"
            descripcion="Cuando alguien reporte un perfil, trabajo o reseña, va a aparecer acá."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {abiertos.map((r) => (
              <li key={r.id}>
                <FilaReporte fila={r} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {pestana === "en_revision" ? (
        enRevision.length === 0 ? (
          <Vacio
            titulo="No hay reportes en revisión"
            descripcion="Los reportes que marques en revisión para investigar quedarán listados acá."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {enRevision.map((r) => (
              <li key={r.id}>
                <FilaReporte fila={r} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {pestana === "resueltos" ? (
        resueltos.length === 0 ? (
          <Vacio
            titulo="No hay reportes resueltos"
            descripcion="El historial de reportes con resolución aparecerá acá."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {resueltos.map((r) => (
              <li key={r.id}>
                <FilaReporte fila={r} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {pestana === "resenas_bajas" ? (
        resenasBajas.length === 0 ? (
          <Vacio
            titulo="No hay reseñas de 1 o 2 estrellas"
            descripcion="Las reseñas con puntuación baja para monitoreo proactivo aparecerán acá."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {resenasBajas.map((resena) => (
              <li key={resena.id}>
                <FilaResenaBaja fila={resena} />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
