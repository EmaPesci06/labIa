import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BotonGoogle, SeparadorO } from "@/components/auth/BotonGoogle";
import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import { FormularioIngreso } from "@/components/auth/FormularioIngreso";
import { volverSeguro } from "@/lib/auth/rutas";

export const metadata: Metadata = { title: "Ingresar · LabÍA" };

const ERRORES: Record<string, string> = {
  enlace: "El enlace venció o ya se usó. Pedí uno nuevo o ingresá con tu contraseña.",
  cancelado: "No se completó el ingreso con Google. Probá de nuevo.",
  rol: "No pudimos guardar tu tipo de cuenta. Probá de nuevo.",
  config: "El ingreso todavía no está disponible. Probá de nuevo más tarde.",
};

async function Contenido({ searchParams }: PageProps<"/ingresar">) {
  const consulta = await searchParams;
  const valor = (clave: string) => {
    const dato = consulta[clave];
    return Array.isArray(dato) ? dato[0] : dato;
  };
  const volver = volverSeguro(valor("volver")) ?? undefined;
  const error = ERRORES[valor("error") ?? ""];

  return (
    <>
      {error ? (
        <p role="alert" className="rounded-campo bg-sol p-3.5 text-sm font-bold text-sobre-sol">
          {error}
        </p>
      ) : null}
      <BotonGoogle volver={volver} />
      <SeparadorO />
      <FormularioIngreso volver={volver} />
      <div className="-mx-5 mt-auto -mb-8 flex items-center justify-between rounded-t-hoja bg-superficie px-5 pt-4 pb-5 lg:mx-0 lg:mt-6 lg:mb-0 lg:rounded-tarjeta">
        <span className="text-base text-texto">¿Primera vez?</span>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-boton border-[3px] border-texto px-5 text-base font-bold text-texto hover:bg-fondo"
        >
          Crear cuenta
        </Link>
      </div>
    </>
  );
}

export default function Ingresar(props: PageProps<"/ingresar">) {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-1">
      <EncabezadoAuth titulo="¡Hola de nuevo!" volverA={null} />
      <Suspense fallback={null}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
