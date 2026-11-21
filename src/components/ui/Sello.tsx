import { useId } from "react";

import { cn } from "@/lib/cn";

type Props = {
  /** Texto que da la vuelta al sello, en mayúsculas. */
  texto?: string;
  /** Con `true` el sello se estampa al aparecer (sin animación si la persona pidió menos movimiento). */
  estampar?: boolean;
  /** Tamaño y lugar: `size-24`, `absolute right-3 top-3`… El color es `text-adorno` salvo que se pise. */
  className?: string;
};

/**
 * Sello de Oficio Seguro: anillo doble con texto circular y tilde al centro, girado 12 grados. Marca
 * lo verificado y cada cambio de estado; es la única pieza "del mundo" de la marca. Es decorativo
 * (`aria-hidden`): el estado lo dice siempre el texto de al lado. Su color es el token `adorno`,
 * nunca lleva texto que la persona tenga que leer.
 *
 * @example
 * <Sello className="size-24" estampar />
 */
export function Sello({
  texto = "Oficio Seguro · Verificado ·",
  estampar = false,
  className,
}: Props) {
  const id = `sello-${useId().replace(/:/g, "")}`;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      className={cn("-rotate-12 text-adorno", estampar && "sello-estampar", className)}
    >
      <defs>
        <path id={id} d="M50 50m-33 0a33 33 0 1 1 66 0a33 33 0 1 1-66 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        fill="currentColor"
        fontSize="10.5"
        fontWeight="700"
        letterSpacing="1.6"
        className="font-etiqueta"
      >
        <textPath href={`#${id}`} startOffset="0">
          {texto.toUpperCase()}
        </textPath>
      </text>
      <path
        d="M36 51l10 10 19-21"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
