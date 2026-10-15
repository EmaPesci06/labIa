import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { Logo } from "@/components/ui/Logo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Cuenta suspendida · LabÍA",
};

// El motivo es de cada usuario: el contenido se lee en cada pedido (dentro de Suspense, como en
// (app)/layout), nunca en el build.
async function Contenido() {
  await connection();

  let motivo: string | null = null;

  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase.rpc("mi_motivo_suspension");
    motivo = data;
  }

  const emailContacto = process.env.EMAIL_SOPORTE || "soporte@labia.com.ar";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-fondo px-4 py-8 text-texto">
      <main className="w-full max-w-[480px]">
        <Tarjeta borde className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <Logo variante="icono" alt="" />
            <h1 className="font-titulo text-2xl font-extrabold sm:text-3xl">
              Tu cuenta fue suspendida
            </h1>
            <p className="text-sm text-texto-secundario">
              Se detectó una infracción a las normas de la comunidad de LabÍA.
            </p>
          </div>

          <div className="rounded-[14px] border border-error/20 bg-error/10 p-4">
            <p className="text-xs font-bold tracking-wider text-error uppercase">
              Motivo de la suspensión
            </p>
            <p className="mt-1 text-sm font-semibold text-texto">
              {motivo || "Incumplimiento de las normas de convivencia o términos del servicio."}
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-texto-secundario">
            <p>
              Mientras tu cuenta esté suspendida, no podés publicar trabajos, postularte ni recibir
              o enviar mensajes.
            </p>
            <p>
              Si considerás que esto se trata de un error o querés solicitar una apelación,
              escribinos a{" "}
              <a
                href={`mailto:${emailContacto}?subject=Apelaci%C3%B3n%20de%20cuenta%20suspendida`}
                className="font-bold text-azul hover:underline"
              >
                {emailContacto}
              </a>
              .
            </p>
          </div>

          <div className="border-t border-divisor pt-4">
            <BotonSalir className="justify-center border border-borde bg-superficie hover:bg-azul-suave" />
          </div>
        </Tarjeta>
      </main>
    </div>
  );
}

export default function PaginaCuentaSuspendida() {
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
