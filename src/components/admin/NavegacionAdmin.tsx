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
              // Sección actual: pastilla `destacado` sobre el encabezado de equipo (boceto App-AdminVerificaciones).
              "inline-flex min-h-11 items-center rounded-full px-3.5 text-[15px]",
              activo ? "bg-destacado font-bold text-sobre-destacado" : "text-sobre-encabezado",
            )}
          >
            {seccion.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
