/** Roles de una cuenta (enum `rol` de la base). `admin` solo se asigna a mano. */
export type RolUsuario = "cliente" | "profesional" | "admin";

/** Pantalla de inicio de cada rol (LAB-16). */
export function inicioDelRol(rol: RolUsuario): string {
  if (rol === "profesional") return "/trabajos";
  if (rol === "admin") return "/admin/verificaciones";
  return "/inicio";
}

const PREFIJOS_CON_SESION = [
  "/inicio",
  "/buscar",
  "/profesionales",
  "/trabajos",
  "/mis-trabajos",
  "/cuenta",
] as const;

const coincide = (ruta: string, prefijo: string) =>
  ruta === prefijo || ruta.startsWith(`${prefijo}/`);

export const esRutaAdmin = (ruta: string) => coincide(ruta, "/admin");

/** ¿Es una ruta del grupo `(app)`, que exige sesión? */
export const esRutaConSesion = (ruta: string) =>
  PREFIJOS_CON_SESION.some((prefijo) => coincide(ruta, prefijo));

/** Rutas que solo tienen sentido sin sesión: con sesión cada uno va a su inicio. */
export const esRutaSoloVisitantes = (ruta: string) => ruta === "/" || ruta === "/ingresar";

/** Rol que exige una ruta, o `null` si sirve para cualquier rol con sesión. */
export function rolExigido(ruta: string): "cliente" | "profesional" | null {
  if (coincide(ruta, "/trabajos/nuevo") || coincide(ruta, "/mis-trabajos")) return "cliente";
  if (ruta === "/trabajos") return "profesional";
  return null;
}

/** ¿Hace falta conocer la sesión para decidir? Evita consultar a Supabase en rutas públicas. */
export const necesitaSesion = (ruta: string) =>
  esRutaAdmin(ruta) || esRutaConSesion(ruta) || esRutaSoloVisitantes(ruta);

export type Decision =
  { tipo: "pasar" } | { tipo: "redirigir"; destino: string } | { tipo: "no-encontrada" };

/**
 * Qué hacer con un pedido según la ruta y el rol de la sesión (`null` = sin sesión).
 * - `(app)` sin sesión: a `/ingresar?volver=<ruta>`.
 * - `/admin/*`: solo `admin`; a cualquier otro (o sin sesión) se le responde 404.
 * - Rutas de un rol: el otro rol vuelve a su inicio. Un admin en `(app)` va a su panel.
 * - `/` y `/ingresar` con sesión: al inicio del rol.
 */
export function decidirAcceso(ruta: string, consulta: string, rol: RolUsuario | null): Decision {
  if (esRutaAdmin(ruta)) return rol === "admin" ? { tipo: "pasar" } : { tipo: "no-encontrada" };

  if (esRutaConSesion(ruta)) {
    if (!rol) {
      const volver = encodeURIComponent(`${ruta}${consulta}`);
      return { tipo: "redirigir", destino: `/ingresar?volver=${volver}` };
    }
    if (rol === "admin") return { tipo: "redirigir", destino: inicioDelRol("admin") };
    const exigido = rolExigido(ruta);
    if (exigido && exigido !== rol) return { tipo: "redirigir", destino: inicioDelRol(rol) };
    return { tipo: "pasar" };
  }

  if (esRutaSoloVisitantes(ruta) && rol) {
    return { tipo: "redirigir", destino: inicioDelRol(rol) };
  }
  return { tipo: "pasar" };
}

/**
 * Valida el parámetro `volver`: solo rutas internas ("/algo"), nunca "//host", "/\host" ni URLs.
 * Evita que `/ingresar?volver=https://malo.com` sea un redireccionamiento abierto.
 */
export function volverSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null;
  // Caracteres de control o saltos de línea: nada de inyectar encabezados.
  for (const caracter of valor) {
    const codigo = caracter.charCodeAt(0);
    if (codigo < 32 || codigo === 127) return null;
  }
  if (valor.length > 500) return null;
  // Las pantallas de acceso no son un destino útil: se vuelve al inicio del rol.
  const path = valor.split(/[?#]/)[0] ?? valor;
  if (esRutaSoloVisitantes(path) || coincide(path, "/api")) return null;
  return valor;
}
