import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SaltarAlContenido } from "@/components/navegacion/SaltarAlContenido";
import { Sello } from "@/components/ui/Sello";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Perfil enviado · Oficio Seguro" };

const PUNTOS = [
  "La revisión la hace una persona y suele tardar uno o dos días hábiles.",
  "Te avisamos por email cuando tu perfil se publique.",
  "Hasta entonces no aparecés en las búsquedas ni podés postularte.",
] as const;

function ContenidoListo({ nombre }: { nombre: string | null }) {
  return (
    <div
      data-encabezado="turquesa"
      className="flex min-h-dvh flex-col bg-encabezado text-sobre-encabezado"
    >
      <SaltarAlContenido />
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pt-10 pb-5 focus:outline-none"
      >
        <div className="my-auto py-4">
          <Sello estampar className="size-28" />
          <h1 className="mt-[22px] font-titulo text-[48px] leading-[0.98] font-extrabold lg:text-[56px]">
            {nombre ? `¡Listo, ${nombre}!` : "¡Listo!"}
          </h1>
          <p className="mt-3.5 text-[19px] leading-[1.4]">
            Estamos revisando tus documentos. Mientras tanto ya podés ver trabajos.
          </p>
          <ul className="mt-6 flex flex-col gap-3 text-[17px] leading-[1.35]">
            {PUNTOS.map((texto) => (
              <li key={texto} className="flex gap-3">
                <span aria-hidden className="mt-[7px] size-2.5 flex-none rounded-full bg-accion" />
                <span>{texto}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-col pt-4">
          <Link
            href="/trabajos"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-superficie px-6 text-lg font-bold text-texto no-underline transition-colors hover:bg-superficie/90 focus-visible:outline-sobre-encabezado"
          >
            Ver trabajos de mi zona
          </Link>
          <Link
            href="/cuenta/perfil"
            className="inline-flex min-h-12 items-center self-center text-base font-bold text-sobre-encabezado underline decoration-2 underline-offset-4 focus-visible:outline-sobre-encabezado"
          >
            Editar mi perfil
          </Link>
        </div>
      </main>
    </div>
  );
}

async function ListoConNombre() {
  const sesion = await obtenerSesion();
  return <ContenidoListo nombre={sesion?.perfil.nombre ?? null} />;
}

/** Confirmación al terminar el registro de profesional (LAB-20, LAB-77: `App-ProListo`). */
export default function RegistroProfesionalListo() {
  return (
    <Suspense fallback={<ContenidoListo nombre={null} />}>
      <ListoConNombre />
    </Suspense>
  );
}
