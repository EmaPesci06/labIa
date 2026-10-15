import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

import { cabecerasDeSeguridad } from "./src/lib/seguridad/cabeceras";

// Fotos del bucket público `fotos` de Supabase Storage (LAB-18): se muestran con next/image.
const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const hostSupabase = urlSupabase ? new URL(urlSupabase) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hostSupabase
      ? [
          {
            protocol: hostSupabase.protocol === "http:" ? "http" : "https",
            hostname: hostSupabase.hostname,
            port: hostSupabase.port,
            pathname: "/storage/v1/object/public/fotos/**",
            search: "",
          },
        ]
      : [],
    // Supabase local (127.0.0.1) cuenta como IP privada para el optimizador de imágenes.
    dangerouslyAllowLocalIP:
      process.env.NODE_ENV !== "production" && hostSupabase?.hostname === "127.0.0.1",
  },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // Cabeceras de seguridad en todas las rutas (LAB-55, H-01 de LAB-34).
        source: "/(.*)",
        headers: cabecerasDeSeguridad({
          desarrollo: process.env.NODE_ENV !== "production",
          urlSupabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
          dsnSentry: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
          hostPosthog: process.env.NEXT_PUBLIC_POSTHOG_HOST || undefined,
        }),
      },
      {
        // El navegador tiene que revisar sw.js en cada visita para enterarse de las versiones nuevas.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Sentry (LAB-15): sube los source maps solo si hay SENTRY_AUTH_TOKEN (CI y Vercel).
// Sin token el build no sube nada y no falla.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: !process.env.CI,
  telemetry: false,
});
