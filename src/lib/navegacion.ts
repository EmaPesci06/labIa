import type { RolApp } from "@/lib/sesion";

export type IconoNav = "inicio" | "trabajos" | "postulaciones" | "perfil" | "cuenta";

/**
 * Un destino de la navegación.
 * - `href`: a dónde lleva.
 * - `coincidencias`: prefijos de ruta que lo marcan como activo (por defecto, el path de `href`).
 * - `vista`: valor de `?vista=` que lo distingue de otro destino con el mismo path.
 */
export type Destino = {
  etiqueta: string;
  href: string;
  icono: IconoNav;
  coincidencias?: readonly string[];
  vista?: "mias";
};

export type NavegacionRol = {
  /** Los 3 ítems de la barra inferior de celular. */
  celular: readonly Destino[];
  /** Los links del centro de la barra superior de escritorio. */
  escritorio: readonly Destino[];
  /** Botón principal de la barra superior. */
  accion: { etiqueta: string; href: string };
};

/** Navegación por rol (LAB-13). El id solo se usa para "Mi perfil" del profesional. */
export function navegacionPara(rol: RolApp, idUsuario: string): NavegacionRol {
  if (rol === "profesional") {
    const destinos: readonly Destino[] = [
      { etiqueta: "Trabajos", href: "/trabajos", icono: "trabajos" },
      {
        etiqueta: "Postulaciones",
        href: "/trabajos?vista=mias",
        icono: "postulaciones",
        vista: "mias",
      },
      { etiqueta: "Mi perfil", href: `/profesionales/${idUsuario}`, icono: "perfil" },
    ];
    return {
      celular: destinos,
      escritorio: destinos,
      accion: { etiqueta: "Ver trabajos", href: "/trabajos" },
    };
  }

  return {
    celular: [
      {
        etiqueta: "Inicio",
        href: "/inicio",
        icono: "inicio",
        coincidencias: ["/inicio", "/buscar", "/profesionales"],
      },
      {
        etiqueta: "Mis trabajos",
        href: "/mis-trabajos",
        icono: "trabajos",
        coincidencias: ["/mis-trabajos", "/trabajos"],
      },
      { etiqueta: "Mi cuenta", href: "/cuenta", icono: "cuenta" },
    ],
    escritorio: [
      {
        etiqueta: "Buscar profesionales",
        href: "/buscar",
        icono: "inicio",
        coincidencias: ["/inicio", "/buscar", "/profesionales"],
      },
      { etiqueta: "Publicar un trabajo", href: "/trabajos/nuevo", icono: "trabajos" },
      { etiqueta: "Mis trabajos", href: "/mis-trabajos", icono: "trabajos" },
    ],
    accion: { etiqueta: "Publicar trabajo", href: "/trabajos/nuevo" },
  };
}

/**
 * ¿Está activo este destino en la ruta actual? `vistaActual` es el valor de `?vista=`.
 * Un prefijo coincide en el límite de un segmento ("/trabajos" activa "/trabajos/nuevo", no
 * "/trabajos-viejos").
 */
export function esDestinoActivo(
  destino: Destino,
  rutaActual: string,
  vistaActual: string | null,
): boolean {
  const pathDestino = destino.href.split("?")[0] ?? destino.href;
  const prefijos = destino.coincidencias ?? [pathDestino];
  const coincideRuta = prefijos.some((p) => rutaActual === p || rutaActual.startsWith(`${p}/`));
  if (!coincideRuta) return false;
  // Mismo path, distinta vista: "Trabajos" (sin vista) y "Postulaciones" (?vista=mias).
  if (destino.vista) return vistaActual === destino.vista;
  if (pathDestino === "/trabajos" && rutaActual === "/trabajos") return vistaActual !== "mias";
  return true;
}
