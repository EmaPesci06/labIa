"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const SECCIONES = [
  { href: "/admin/verificaciones", etiqueta: "Verificaciones" },
  { href: "/admin/reportes", etiqueta: "Reportes" },
] as const;

export function NavegacionAdmin() {
  const ruta = usePathname();

  return (
    <nav aria-label="Secciones del panel" className="flex items-center gap-1 sm:gap-2">
      {SECCIONES.map((seccion) => {
        const activo = ruta.startsWith(seccion.href);
        return (
          <Link
            key={seccion.href}
            href={seccion.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors",
              activo
                ? "bg-azul text-sobre-azul"
                : "text-texto-secundario hover:bg-azul-suave hover:text-texto",
            )}
          >
            {seccion.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
