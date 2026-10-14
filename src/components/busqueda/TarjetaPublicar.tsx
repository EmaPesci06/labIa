import Link from "next/link";

import { cn } from "@/lib/cn";

type Props = {
  titulo: string;
  descripcion: string;
  /** Texto del botón-píldora: "Publicar" en el inicio, "Publicar un trabajo" en la búsqueda. */
  accion: string;
  /** "columna" (inicio de celular) o "fila" (resultados de escritorio). */
  disposicion?: "columna" | "fila";
  className?: string;
};

/**
 * Tarjeta azul que invita a publicar un trabajo (Inicio y final de Resultados). Toda la tarjeta
 * es el link a `/trabajos/nuevo`; sin cuenta, el ingreso lleva de vuelta ahí.
 */
export function TarjetaPublicar({
  titulo,
  descripcion,
  accion,
  disposicion = "columna",
  className,
}: Props) {
  return (
    <Link
      href="/trabajos/nuevo"
      className={cn(
        "flex gap-4 rounded-[18px] bg-azul text-sobre-azul no-underline hover:bg-azul-presionado hover:text-sobre-azul",
        disposicion === "columna"
          ? "flex-col p-[18px]"
          : "flex-col px-[18px] py-[18px] sm:flex-row sm:items-center sm:justify-between lg:px-6 lg:py-[22px]",
        className,
      )}
    >
      <span className="flex flex-col gap-1.5">
        <span className="text-lg font-bold">{titulo}</span>
        <span className="text-sm leading-snug opacity-80 lg:text-[15px]">{descripcion}</span>
      </span>
      <span
        className={cn(
          "inline-flex min-h-11 items-center self-start rounded-full bg-sobre-azul px-4 text-sm font-bold text-azul lg:text-[15px]",
          disposicion === "columna" && "mt-1.5",
        )}
      >
        {accion}
      </span>
    </Link>
  );
}
