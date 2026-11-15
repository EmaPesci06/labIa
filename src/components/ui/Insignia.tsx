import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type VarianteInsignia = "verificada" | "antecedentes" | "matriculado" | "urgencia" | "exito";

const DEFINICIONES: Record<VarianteInsignia, { texto: string; icono: LucideIcon; clases: string }> =
  {
    verificada: {
      texto: "Identidad verificada",
      icono: BadgeCheck,
      clases: "border-2 border-accion bg-superficie text-texto",
    },
    antecedentes: {
      texto: "Sin antecedentes",
      icono: ShieldCheck,
      clases: "border-2 border-accion bg-superficie text-texto",
    },
    matriculado: {
      texto: "Matriculado",
      icono: Wrench,
      clases: "bg-sol text-sobre-sol",
    },
    urgencia: {
      texto: "Lo antes posible",
      icono: Clock,
      clases: "bg-sol text-sobre-sol",
    },
    exito: {
      texto: "Contratado",
      icono: CheckCircle2,
      clases: "bg-accion text-sobre-accion",
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
 * Insignia de estado o verificación: píldora en negrita. Verificación y antecedentes van con
 * borde turquesa sobre superficie; matrícula y urgencia en sol; "Contratado" en turquesa.
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
  const { texto, icono: Icono, clases } = DEFINICIONES[variante];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold",
        tamano === "chica" ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-[15px]",
        clases,
        className,
      )}
    >
      {conIcono ? <Icono aria-hidden strokeWidth={2.5} className="size-4" /> : null}
      {children ?? texto}
    </span>
  );
}
