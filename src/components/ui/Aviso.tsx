import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Aviso de seguridad: caja azul suave con escudo, como "Se comprometió con las normas de seguridad
 * de LabÍA." en el perfil del prototipo.
 */
export function Aviso({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-center gap-2.5 rounded-[14px] bg-azul-suave p-3.5 text-sm leading-snug text-sobre-azul-suave",
        className,
      )}
    >
      <ShieldCheck aria-hidden strokeWidth={2} className="size-[22px] shrink-0" />
      <div>{children}</div>
    </div>
  );
}
