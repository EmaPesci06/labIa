import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import { SincronizarTema } from "@/components/SincronizarTema";
import { PWA_COLORES } from "@/lib/pwa";
import { SCRIPT_TEMA } from "@/lib/tema";

import { clasesFuentes } from "./fuentes";
import "./globals.css";

import { MetricasPostHog } from "@/components/MetricasPostHog";
import { PieLegal } from "@/components/PieLegal";

// viewport-fit=cover deja que la página llegue al borde en celulares con notch; las barras usan
// env(safe-area-inset-*). theme-color cambia con el tema del sistema.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PWA_COLORES.fondoClaro },
    { media: "(prefers-color-scheme: dark)", color: PWA_COLORES.fondoOscuro },
  ],
};

export const metadata: Metadata = {
  title: "LabÍA",
  description: "Oficios de confianza en Mar del Plata.",
  applicationName: "LabÍA",
  // iOS: abre en pantalla completa al agregarla a la pantalla de inicio.
  appleWebApp: { capable: true, title: "LabÍA", statusBarStyle: "default" },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script de tema agrega la clase `dark` antes de hidratar.
    <html lang="es-AR" className={`${clasesFuentes} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SincronizarTema />
        {children}
        <PieLegal />
        {/* usePathname() en una ruta dinámica (/profesionales/[id]) exige Suspense. */}
        <Suspense fallback={null}>
          <MetricasPostHog />
        </Suspense>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
