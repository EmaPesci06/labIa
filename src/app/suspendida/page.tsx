import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Logo } from "@/components/ui/Logo";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Cuenta suspendida · LabÍA",
};

// El motivo es de cada usuario: el contenido se lee en cada pedido (dentro de Suspense, como en
// (app)/layout), nunca en el build (LAB-32, LAB-80: boceto `App-Suspendida`).
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
    <div className="flex min-h-dvh flex-col bg-equipo text-sobre-encabezado [&_:focus-visible]:outline-sol">
      <SaltarAlContenido />
      <header className="mx-auto w-full max-w-[720px] px-6 pt-4 pb-0 lg:pt-6">
        <Logo alt="LabÍA" sobre="encabezado" />
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-6 py-8 focus:outline-none"
      >
        <h1 className="font-titulo text-[44px] leading-[0.98] lg:text-[56px]">
          Tu cuenta fue suspendida
        </h1>
        <p className="mt-3.5 text-lg leading-[1.4]">
          Se detectó una infracción a las normas de la comunidad de LabÍA.
        </p>

        <section
          aria-labelledby="motivo-suspension"
          className="mt-5 rounded-tarjeta bg-fondo px-[18px] py-4 text-texto"
        >
          <h2 id="motivo-suspension" className="mb-1 text-[15px] font-bold">
            Motivo de la suspensión
          </h2>
          <p className="text-[17px] leading-[1.4]">
            {motivo || "Incumplimiento de las normas de convivencia o términos del servicio."}
          </p>
        </section>

        <p className="mt-[18px] text-base leading-[1.45]">
          Mientras tu cuenta esté suspendida, no podés publicar trabajos, postularte ni recibir
          contactos.
        </p>
        <p className="mt-2.5 text-base leading-[1.45]">
          Si considerás que se trata de un error o querés pedir una apelación, escribinos a{" "}
          <a
            href={`mailto:${emailContacto}?subject=Apelaci%C3%B3n%20de%20cuenta%20suspendida`}
            className="font-bold text-sobre-encabezado underline underline-offset-2"
          >
            {emailContacto}
          </a>
          .
        </p>
      </main>

      <footer className="mx-auto flex w-full max-w-[720px] flex-col gap-2 px-6 pt-4 pb-5">
        <a
          href={`mailto:${emailContacto}?subject=Apelaci%C3%B3n%20de%20cuenta%20suspendida`}
          className="flex min-h-14 items-center justify-center rounded-boton bg-sol px-6 text-lg font-bold text-sobre-sol no-underline transition-colors hover:bg-sol/90"
        >
          Pedir una apelación
        </a>
        <div className="flex items-center justify-between">
          <Link
            href="/normas"
            className="flex min-h-12 items-center text-base font-bold text-sobre-encabezado underline underline-offset-4"
          >
            Leer las normas
          </Link>
          <BotonSalir className="min-h-12 w-auto px-2 text-base font-bold text-sobre-encabezado underline underline-offset-4 hover:bg-transparent" />
        </div>
      </footer>
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
