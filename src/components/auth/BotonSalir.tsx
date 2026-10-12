"use client";

import { LogOut } from "lucide-react";

import { salir } from "@/lib/auth/acciones";
import { cn } from "@/lib/cn";

/** Cierra la sesión (Server Action) y vuelve a la bienvenida. Funciona también sin JavaScript. */
export function BotonSalir({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <form action={salir}>
      <button
        type="submit"
        onClick={onClick}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-campo px-3 text-[15px] font-semibold text-texto hover:bg-azul-suave",
          className,
        )}
      >
        <LogOut aria-hidden strokeWidth={2} className="size-5" />
        Salir
      </button>
    </form>
  );
}
