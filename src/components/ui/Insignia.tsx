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
      clases: "bg-azul-suave text-sobre-azul-suave",
    },
    antecedentes: {
      texto: "Sin antecedentes",
      icono: ShieldCheck,
      clases: "bg-azul-suave text-sobre-azul-suave",
    },
    matriculado: {
      texto: "Matriculado",
      icono: Wrench,
      clases: "bg-naranja-suave text-sobre-naranja-suave",
    },
    urgencia: {
      texto: "Lo antes posible",
      icono: Clock,
      clases: "bg-naranja-suave text-sobre-naranja-suave",
    },
    exito: {
      texto: "Contratado",
      icono: CheckCircle2,
      clases: "bg-exito-suave text-sobre-exito-suave",
    },
  };

type Props = {
  variante: VarianteInsignia;
  /** Reemplaza el texto por defecto de la variante. */
  children?: ReactNode;
  /** "chica" (12 px, listas y tarjetas) o "grande" (13 px, perfil). */
  tamano?: "chica" | "grande";
  /** Muestra el ícono antes del texto. Por defecto no, como en el prototipo. */
  conIcono?: boolean;
  className?: string;
};

/**
 * Insignia de estado o verificación (píldora, texto 12–13 px peso 700).
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
        "inline-flex items-center gap-1 rounded-full font-bold",
        tamano === "chica" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
        clases,
        className,
      )}
    >
      {conIcono ? <Icono aria-hidden strokeWidth={2} className="size-3.5" /> : null}
      {children ?? texto}
    </span>
  );
}
