import { Briefcase, House, MessageSquare, User, type LucideIcon } from "lucide-react";

import type { IconoNav } from "@/lib/navegacion";

/** Íconos de lucide-react equivalentes a los SVG del prototipo (trazo de 2 px, redondeado). */
const ICONOS: Record<IconoNav, LucideIcon> = {
  inicio: House,
  trabajos: Briefcase,
  postulaciones: MessageSquare,
  perfil: User,
  cuenta: User,
};

export function IconoDestino({ icono, className }: { icono: IconoNav; className?: string }) {
  const Icono = ICONOS[icono];
  return <Icono aria-hidden strokeWidth={2} className={className} />;
}
