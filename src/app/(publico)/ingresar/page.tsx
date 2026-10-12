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
        <p
          role="alert"
          className="rounded-campo bg-naranja-suave p-3.5 text-sm font-semibold text-sobre-naranja-suave"
        >
          {error}
        </p>
      ) : null}
      <BotonGoogle volver={volver} />
      <SeparadorO />
      <FormularioIngreso volver={volver} />
      <p className="pt-2 text-center text-[15px] text-texto-secundario">
        ¿Todavía no tenés cuenta?{" "}
        <Link
          href="/"
          className="inline-block py-3 font-bold text-azul underline underline-offset-2"
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}

export default function Ingresar(props: PageProps<"/ingresar">) {
  return (
    <div className="flex flex-col gap-[18px]">
      <EncabezadoAuth titulo="Ingresá a LabÍA" bajada="Con tu email o con tu cuenta de Google." />
      <Suspense fallback={null}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
