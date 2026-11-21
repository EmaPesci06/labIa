import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/cn";

export type VarianteInsignia = "verificada" | "antecedentes" | "matriculado" | "urgencia" | "exito";

type VarianteBadge = "default" | "secondary" | "outline";

const DEFINICIONES: Record<
  VarianteInsignia,
  { texto: string; icono: LucideIcon; badge: VarianteBadge; clases: string }
> = {
  verificada: {
    texto: "Identidad verificada",
    icono: BadgeCheck,
    badge: "outline",
    clases: "border-2 border-primary bg-card text-foreground",
  },
  antecedentes: {
    texto: "Sin antecedentes",
    icono: ShieldCheck,
    badge: "outline",
    clases: "border-2 border-primary bg-card text-foreground",
  },
  matriculado: {
    texto: "Matriculado",
    icono: Wrench,
    badge: "secondary",
    clases: "",
  },
  urgencia: {
    texto: "Lo antes posible",
    icono: Clock,
    badge: "secondary",
    clases: "",
  },
  exito: {
    texto: "Contratado",
    icono: CheckCircle2,
    badge: "default",
    clases: "",
  },
};

type Props = {
  variante: VarianteInsignia;
  /** Reemplaza el texto por defecto de la variante. */
  children?: ReactNode;
  /** "chica" (12 px, listas y tarjetas) o "grande" (15 px, perfil). */
  tamano?: "chica" | "grande";
  /** Muestra el ícono antes del texto. Por defecto no, como en el prototipo. */
  conIcono?: boolean;
  className?: string;
};

/**
 * Insignia de estado o verificación: capa fina sobre el `Badge` de shadcn, píldora en negrita. Verificación y antecedentes van con
 * borde turquesa sobre superficie; matrícula y urgencia en destacado; "Contratado" en turquesa.
 *
 * @example
 * <Insignia variante="verificada" />
 * <Insignia variante="urgencia">Esta semana</Insignia>
 */
export function Insignia({
  variante,
  children,
  tamano = "chica",
  conIcono = false,
  className,
}: Props) {
  const { texto, icono: Icono, badge, clases } = DEFINICIONES[variante];
  return (
    <Badge
      variant={badge}
      className={cn(
        "h-auto gap-1.5 font-bold [&>svg]:size-4!",
        tamano === "chica" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-[15px]",
        clases,
        className,
      )}
    >
      {conIcono ? <Icono aria-hidden strokeWidth={2.5} className="size-4" /> : null}
      {children ?? texto}
    </Badge>
  );
}
