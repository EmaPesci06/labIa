import type { Metadata } from "next";
import "./globals.css";

import { MetricasPostHog } from "@/components/MetricasPostHog";
import { PieLegal } from "@/components/PieLegal";

export const metadata: Metadata = {
  title: "LabÍA",
  description: "Oficios de confianza en Mar del Plata.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <PieLegal />
        <MetricasPostHog />
      </body>
    </html>
  );
}
