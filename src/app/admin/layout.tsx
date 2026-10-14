import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Logo } from "@/components/ui/Logo";
import { sesionAdmin } from "@/lib/admin/sesion";

/**
 * Panel interno (LAB-21). Solo rol `admin`: a cualquier otro se le responde 404, igual que el proxy.
 * La comprobación se repite acá a propósito (defensa en profundidad).
 */
/** Con Cache Components, lo que lee la sesión va dentro de un límite Suspense (como en `(app)`). */
export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-fondo" />}>
      <MarcoAdmin>{children}</MarcoAdmin>
    </Suspense>
  );
}

async function MarcoAdmin({ children }: { children: ReactNode }) {
  const sesion = await sesionAdmin();
  if (!sesion) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-fondo text-texto">
      <SaltarAlContenido />
      <header className="border-b border-divisor bg-superficie">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-5 py-3 lg:px-10">
          <div className="flex items-center gap-3">
            <Logo variante="icono" alt="" />
            <p className="font-mono text-xs font-semibold tracking-[0.4px] text-texto-secundario uppercase">
              Panel interno · LabÍA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-texto-secundario sm:block">
              {sesion.perfil.nombreVisible}
            </p>
            <BotonSalir className="min-h-11 w-auto px-3" />
          </div>
        </div>
      </header>
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 focus:outline-none sm:px-5 lg:px-10 lg:py-8"
      >
        {children}
      </main>
    </div>
  );
}
