import { cn } from "@/lib/cn";
import { NORMAS, QUE_HACE_LABIA } from "@/lib/normas";

/** Los diez compromisos, numerados. Una columna en celular; dos en escritorio con `dosColumnas`. */
export function ListaNormas({ dosColumnas = false }: { dosColumnas?: boolean }) {
  return (
    <ol
      aria-label="Compromisos de seguridad"
      className={cn("grid gap-2", dosColumnas && "lg:grid-cols-2 lg:gap-3")}
    >
      {NORMAS.map((texto, i) => (
        <li
          key={texto}
          className="flex items-start gap-3 rounded-xl bg-superficie px-3.5 py-2.5 text-[15px] leading-[1.35] lg:p-4"
        >
          <span
            aria-hidden
            className="flex size-7 flex-none items-center justify-center rounded-full bg-sol font-texto text-[15px] font-bold text-sobre-sol"
          >
            {i + 1}
          </span>
          <span>{texto}</span>
        </li>
      ))}
    </ol>
  );
}

/** Sección "Qué hace Oficio Seguro" (la parte que le toca a la plataforma). */
export function QueHaceLabia() {
  return (
    <section
      aria-labelledby="que-hace-labia"
      className="flex flex-col gap-2 rounded-3xl bg-equipo p-4 text-sobre-encabezado lg:p-5"
    >
      <h2 id="que-hace-labia" className="font-titulo text-[22px] leading-tight">
        Qué hace Oficio Seguro
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-[1.35]">
        {QUE_HACE_LABIA.map((texto) => (
          <li key={texto}>{texto}</li>
        ))}
      </ul>
    </section>
  );
}
