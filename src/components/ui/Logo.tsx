import Image from "next/image";

import { cn } from "@/lib/cn";

type Props = {
  /** "completo": ícono + "labia". "icono": solo la casita (sirve para los dos temas). */
  variante?: "completo" | "icono";
  /** Texto alternativo. Pasá "" si el logo está al lado del nombre y es decorativo. */
  alt?: string;
  /** Usalo en el logo que se ve sin hacer scroll (bienvenida, encabezado). */
  prioritario?: boolean;
  className?: string;
};

const COMPLETO = { ancho: 729, alto: 240 };
const ICONO = 256;

/**
 * Logo de LabÍA. En la variante "completo" hay dos imágenes y CSS muestra una sola según el tema
 * (`dark:hidden` / `hidden dark:block`); con carga diferida solo se descarga la visible.
 */
export function Logo({
  variante = "completo",
  alt = "LabÍA",
  prioritario = false,
  className,
}: Props) {
  const carga = prioritario ? ({ fetchPriority: "high" } as const) : {};

  if (variante === "icono") {
    return (
      <Image
        src="/marca/labia-icono.png"
        alt={alt}
        width={ICONO}
        height={ICONO}
        className={cn("size-10", className)}
        {...carga}
      />
    );
  }

  const clases = cn("h-10 w-auto", className);
  return (
    <>
      <Image
        src="/marca/labia-logo.png"
        alt={alt}
        width={COMPLETO.ancho}
        height={COMPLETO.alto}
        className={cn(clases, "dark:hidden")}
        data-tema="claro"
        {...carga}
      />
      <Image
        src="/marca/labia-logo-oscuro.png"
        alt={alt}
        width={COMPLETO.ancho}
        height={COMPLETO.alto}
        className={cn(clases, "hidden dark:block")}
        data-tema="oscuro"
        {...carga}
      />
    </>
  );
}
