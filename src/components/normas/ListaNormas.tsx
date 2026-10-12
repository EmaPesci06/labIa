import { cn } from "@/lib/cn";
import { NORMAS, QUE_HACE_LABIA } from "@/lib/normas";

/** Los diez compromisos, numerados. Una columna en celular; dos en escritorio con `dosColumnas`. */
export function ListaNormas({ dosColumnas = false }: { dosColumnas?: boolean }) {
  return (
    <ol
      aria-label="Compromisos de seguridad"
      className={cn("grid gap-2.5", dosColumnas && "lg:grid-cols-2 lg:gap-3")}
    >
      {NORMAS.map((texto, i) => (
        <li
          key={texto}
          className="flex items-start gap-3 rounded-[14px] bg-superficie px-3.5 py-3 lg:p-4"
        >
          <span
            aria-hidden
            className="flex size-[26px] flex-none items-center justify-center rounded-full bg-azul-suave font-mono text-[13px] font-semibold text-sobre-azul-suave lg:size-7"
          >
            {i + 1}
          </span>
          <span className="text-[15px] leading-snug">{texto}</span>
        </li>
      ))}
    </ol>
  );
}

/** Sección "Qué hace LabÍA" (la parte que le toca a la plataforma). */
export function QueHaceLabia() {
  return (
    <section aria-labelledby="que-hace-labia" className="flex flex-col gap-3">
      <h2 id="que-hace-labia" className="font-titulo text-[22px] leading-tight">
        Qué hace LabÍA
      </h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-snug text-texto-secundario">
        {QUE_HACE_LABIA.map((texto) => (
          <li key={texto}>{texto}</li>
        ))}
      </ul>
    </section>
  );
}
