/** Roles de una cuenta (enum `rol` de la base). `admin` solo se asigna a mano. */
export type RolUsuario = "cliente" | "profesional" | "admin";

/** Estado de una cuenta (enum `estado_usuario` de la base). */
export type EstadoUsuario = "activa" | "suspendida" | "baja";

/** Pantalla de inicio de cada rol (LAB-16). */
export function inicioDelRol(rol: RolUsuario): string {
  if (rol === "profesional") return "/trabajos";
  if (rol === "admin") return "/admin/verificaciones";
  return "/inicio";
}

// `/inicio`, `/buscar` y `/profesionales` son públicas (LAB-23): se puede buscar y ver perfiles sin
// cuenta; para contactar hace falta cuenta de cliente (LAB-25).
const PREFIJOS_CON_SESION = ["/trabajos", "/mis-trabajos", "/cuenta"] as const;

const coincide = (ruta: string, prefijo: string) =>
  ruta === prefijo || ruta.startsWith(`${prefijo}/`);

const PREFIJOS_PUBLICOS_DE_APP = ["/inicio", "/buscar", "/profesionales"] as const;

/** Rutas de `(app)` que se ven sin cuenta (LAB-23): inicio, búsqueda y perfiles. */
export const esRutaPublicaDeApp = (ruta: string) =>
  PREFIJOS_PUBLICOS_DE_APP.some((prefijo) => coincide(ruta, prefijo));

export const esRutaAdmin = (ruta: string) => coincide(ruta, "/admin");

export const esRutaSuspendida = (ruta: string) => ruta === "/suspendida";

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
  esRutaSuspendida(ruta) ||
  esRutaAdmin(ruta) ||
  esRutaConSesion(ruta) ||
  esRutaPublicaDeApp(ruta) ||
  esRutaSoloVisitantes(ruta);

export type Decision =
  { tipo: "pasar" } | { tipo: "redirigir"; destino: string } | { tipo: "no-encontrada" };

/**
 * Qué hacer con un pedido según la ruta, el rol y el estado de la sesión (`null` = sin sesión).
 * - Cuenta suspendida: redirige a `/suspendida` desde cualquier ruta salvo endpoints de auth.
 * - `/suspendida` sin cuenta suspendida: redirige al inicio del rol o a `/ingresar`.
 * - `(app)` sin sesión: a `/ingresar?volver=<ruta>` (salvo inicio, búsqueda y perfiles, que son públicos).
 * - `/admin/*`: solo `admin`; a cualquier otro (o sin sesión) se le responde 404.
 * - Rutas de un rol: el otro rol vuelve a su inicio. Un admin en `(app)` va a su panel.
 * - `/` y `/ingresar` con sesión: al inicio del rol.
 */
export function decidirAcceso(
  ruta: string,
  consulta: string,
  rol: RolUsuario | null,
  estado?: EstadoUsuario | null,
): Decision {
  if (estado === "suspendida") {
    if (ruta === "/suspendida") return { tipo: "pasar" };
    if (ruta.startsWith("/api/auth") || ruta === "/cerrar-sesion") return { tipo: "pasar" };
    return { tipo: "redirigir", destino: "/suspendida" };
  }

  if (ruta === "/suspendida") {
    if (rol) return { tipo: "redirigir", destino: inicioDelRol(rol) };
    return { tipo: "redirigir", destino: "/ingresar" };
  }

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

  // Inicio, búsqueda y perfiles: abiertos a visitantes, clientes y profesionales. Un admin tiene su panel.
  if (esRutaPublicaDeApp(ruta)) {
    return rol === "admin"
      ? { tipo: "redirigir", destino: inicioDelRol("admin") }
      : { tipo: "pasar" };
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
