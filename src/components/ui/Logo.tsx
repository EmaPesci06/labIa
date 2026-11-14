import { cn } from "@/lib/cn";

type Props = {
  /** "completo": la palabra LabÍA. "icono": una L en un cuadrado (marcas chicas del admin y avisos). */
  variante?: "completo" | "icono";
  /** Texto alternativo. Pasá "" si el logo está al lado del nombre y es decorativo. */
  alt?: string;
  /** Dónde va el logo: `accion` sobre fondo claro, blanco sobre el encabezado turquesa. */
  sobre?: "fondo" | "encabezado";
  className?: string;
};

/**
 * Logo de LabÍA: la palabra en Baloo 2 800 (font-titulo). Es texto, así que cambia de color con el
 * tema sin imágenes separadas. El logo viejo (PNG) se retira en LAB-68.
 */
export function Logo({ variante = "completo", alt = "LabÍA", sobre = "fondo", className }: Props) {
  const accesibilidad =
    alt === "" ? { "aria-hidden": true } : { role: "img" as const, "aria-label": alt };

  if (variante === "icono") {
    return (
      <span
        {...accesibilidad}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-campo bg-accion font-titulo text-2xl leading-none text-sobre-accion",
          className,
        )}
      >
        L
      </span>
    );
  }

  return (
    <span
      {...accesibilidad}
      className={cn(
        "font-titulo text-3xl leading-none",
        sobre === "encabezado" ? "text-sobre-encabezado" : "text-accion",
        className,
      )}
    >
      LabÍA
    </span>
  );
}
