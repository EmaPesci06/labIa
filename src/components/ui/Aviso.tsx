import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/shadcn/alert";
import { cn } from "@/lib/cn";

/**
 * Nota dentro de una pantalla: capa fina sobre el `Alert` de shadcn, con borde turquesa y escudo,
 * como "Se comprometió con las normas de seguridad de Oficio Seguro." en el perfil del prototipo. Es una
 * nota (`role="note"`), no una alerta: no interrumpe al lector de pantalla. Para una pantalla
 * completa (ícono, título, texto y botón) está `AvisoPantalla`.
 */
export function Aviso({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Alert
      role="note"
      className={cn(
        "items-center gap-x-2.5 border-2 border-primary p-3.5 text-[15px] leading-snug",
        className,
      )}
    >
      <ShieldCheck aria-hidden strokeWidth={2.5} className="size-[22px] text-primary" />
      <AlertDescription className="text-[15px] leading-snug font-bold text-foreground">
        {children}
      </AlertDescription>
    </Alert>
  );
}
