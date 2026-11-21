import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { NavegacionAdmin } from "@/components/admin/NavegacionAdmin";
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
      {/* Sin esquinas redondeadas: el <Encabezado variante="equipo"> de cada página va pegado debajo y
          lleva las esquinas, así que se lee como un solo bloque (boceto App-AdminVerificaciones). */}
      <header className="bg-equipo text-sobre-encabezado">
        <div className="mx-auto flex w-full max-w-[1264px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <p className="text-sm font-bold tracking-[0.08em] uppercase">
              <span translate="no">Oficio Seguro</span> · Equipo
            </p>
            <NavegacionAdmin />
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm sm:block">{sesion.perfil.nombreVisible}</p>
            <BotonSalir className="min-h-11 w-auto px-3 text-sobre-encabezado hover:bg-transparent hover:underline" />
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="marco flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
