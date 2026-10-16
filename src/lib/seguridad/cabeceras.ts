// Cabeceras de seguridad globales (LAB-55, hallazgo H-01 de LAB-34).
// Se aplican desde next.config.ts a todas las rutas, también a las prerenderizadas (cacheComponents).
// No usan nonce: un nonce por pedido obliga a render dinámico en todas las páginas. El motivo completo
// está en el paso 6 de la sección 2 de docs/operacion.md.

export type Cabecera = { key: string; value: string };

export type OpcionesCabeceras = {
  /** `next dev`: habilita eval (React) y el websocket de HMR. */
  desarrollo: boolean;
  /** NEXT_PUBLIC_SUPABASE_URL: REST, Auth, Storage y realtime. */
  urlSupabase?: string;
  /** NEXT_PUBLIC_SENTRY_DSN: el origen del DSN es el ingest de Sentry. */
  dsnSentry?: string;
  /** NEXT_PUBLIC_POSTHOG_HOST: capturas y scripts de extensiones de posthog-js. */
  hostPosthog?: string;
};

/** Origen (esquema, host y puerto) de una URL, o null si falta o no es válida. */
export function origenDe(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Política CSP. Cada directiva tiene su motivo en el comentario:
 * - script-src lleva 'unsafe-inline' porque Next inyecta scripts inline en cada página prerenderizada
 *   (carga del RSC) y los scripts de tema y de redirección de escritorio son inline. Con hashes no
 *   alcanza: el de la redirección depende del barrio, y el de Next cambia por ruta. Con nonce, las
 *   páginas dejarían de prerenderizarse. El resto de las directivas sí se aplica en serio.
 * - form-action admite Supabase y Google porque el ingreso con Google es un Server Action que termina
 *   en redirect() hacia esos hosts, y Chrome aplica form-action también a los redirects.
 */
export function politicaCsp(opciones: OpcionesCabeceras): string {
  const supabase = origenDe(opciones.urlSupabase);
  const sentry = origenDe(opciones.dsnSentry);
  const posthog = origenDe(opciones.hostPosthog ?? "https://us.i.posthog.com");
  const supabaseWs = supabase?.replace(/^http/, "ws") ?? null;

  const conexion = ["'self'", supabase, supabaseWs, sentry, posthog];
  const scripts = ["'self'", "'unsafe-inline'", posthog];
  const imagenes = ["'self'", "data:", "blob:", supabase];
  const formularios = ["'self'", supabase, "https://accounts.google.com"];

  if (opciones.desarrollo) {
    scripts.push("'unsafe-eval'");
    conexion.push("ws:", "wss:");
  }

  const directivas: Array<[string, Array<string | null | undefined>]> = [
    ["default-src", ["'self'"]],
    ["script-src", scripts],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", imagenes],
    ["font-src", ["'self'"]],
    ["connect-src", conexion],
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    // El visor de documentos del admin embebe en un iframe la URL firmada de Storage (PDF).
    ["frame-src", ["'self'", supabase]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", formularios],
    ["frame-ancestors", ["'none'"]],
  ];

  return directivas
    .map(
      ([nombre, valores]) =>
        `${nombre} ${valores.filter((v): v is string => Boolean(v)).join(" ")}`,
    )
    .join("; ");
}

/** Cabeceras globales para `headers()` de next.config.ts. */
export function cabecerasDeSeguridad(opciones: OpcionesCabeceras): Cabecera[] {
  return [
    { key: "Content-Security-Policy", value: politicaCsp(opciones) },
    // frame-ancestors (CSP) es la directiva moderna; X-Frame-Options cubre navegadores viejos.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // La app no usa cámara, micrófono ni geolocalización (la subida de fotos es un input de archivo).
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
  ];
}
