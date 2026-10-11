import type { Metadata } from "next";

import { SincronizarTema } from "@/components/SincronizarTema";
import { SCRIPT_TEMA } from "@/lib/tema";

import { clasesFuentes } from "./fuentes";
import "./globals.css";

export const metadata: Metadata = {
  title: "LabÍA",
  description: "Oficios de confianza en Mar del Plata.",
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
      </body>
    </html>
  );
}
