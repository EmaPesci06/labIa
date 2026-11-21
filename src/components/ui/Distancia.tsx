import { Badge } from "@/components/shadcn/badge";
import { formatearDistancia } from "@/lib/formato";
import { cn } from "@/lib/cn";

type Props = {
  /** Distancia en kilómetros entre centros de barrio. */
  km: number;
  /** Texto después de la distancia, por ejemplo "de vos". */
  sufijo?: string;
  className?: string;
};

/**
 * Distancia en una pastilla (`Badge` de shadcn) sol con texto azul noche: "a 1,2 km" (o "a 1,2 km de vos"). La distancia
 * es entre barrios; nunca se muestra una dirección.
 *
 * @example
 * <Distancia km={1.2} />
 */
export function Distancia({ km, sufijo, className }: Props) {
  return (
    <Badge
      className={cn(
        "h-auto rounded-full bg-sol px-3 py-1 text-sm font-bold text-sobre-sol",
        className,
      )}
    >
      {formatearDistancia(km)}
      {sufijo ? ` ${sufijo}` : ""}
    </Badge>
  );
}
