import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Nota dentro de una pantalla: caja de superficie con borde turquesa y escudo, como "Se
 * comprometió con las normas de seguridad de LabÍA." en el perfil del prototipo. Para una pantalla
 * completa (ícono, título, texto y botón) está `AvisoPantalla`.
 */
export function Aviso({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-center gap-2.5 rounded-tarjeta border-2 border-accion bg-superficie p-3.5 text-[15px] leading-snug font-bold text-texto",
        className,
      )}
    >
      <ShieldCheck aria-hidden strokeWidth={2.5} className="size-[22px] shrink-0 text-accion" />
      <div>{children}</div>
    </div>
  );
}
