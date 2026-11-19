import { NORMAS } from "@/lib/normas";

/**
 * Los diez compromisos de seguridad con círculos turquesas (`bg-encabezado text-sobre-encabezado`),
 * tal como aparecen en `App-ProNormas` y `Oscuro-ProNormas`.
 */
export function ListaNormasRegistro() {
  return (
    <ol aria-label="Compromisos de seguridad" className="flex flex-col gap-2 lg:gap-2.5">
      {NORMAS.map((texto, i) => (
        <li
          key={texto}
          className="flex items-start gap-3 rounded-campo bg-superficie px-3.5 py-2.5 text-[15px] leading-[1.35] text-texto lg:p-4"
        >
          <span
            aria-hidden
            className="flex size-7 flex-none items-center justify-center rounded-full bg-encabezado font-bold text-sobre-encabezado"
          >
            {i + 1}
          </span>
          <span>{texto}</span>
        </li>
      ))}
    </ol>
  );
}
