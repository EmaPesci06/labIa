import type { Metadata } from "next";
import { Suspense } from "react";

import { BotonConfirmarBaja } from "@/components/emails/BotonConfirmarBaja";
import { Boton } from "@/components/ui/Boton";
import { confirmarBaja } from "@/lib/emails/acciones";
import { secretoValido, verificarTokenBaja } from "@/lib/emails/token";

export const metadata: Metadata = { title: "Darte de baja · LabÍA", robots: { index: false } };

type Params = { t?: string; listo?: string; error?: string };

const QUE_DEJAS_DE_RECIBIR: Record<string, string> = {
  trabajos_cerca: "el resumen diario de trabajos nuevos",
  novedades: "los recordatorios y novedades",
};

/**
 * Baja desde el link de un email, sin ingresar. Pide confirmar con un botón (en vez de bajar al
 * abrir el link) para que los antivirus y las vistas previas de los correos no te den de baja solos.
 */
async function Contenido({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, listo, error } = await searchParams;
  const secreto = process.env.EMAILS_SECRET;
  const carga = t && secretoValido(secreto) ? verificarTokenBaja(t, secreto) : null;

  return (
    <>
      {listo && listo in QUE_DEJAS_DE_RECIBIR ? (
        <>
          <p
            role="status"
            className="rounded-campo bg-exito-suave p-4 font-semibold text-sobre-exito-suave"
          >
            Listo. Ya no vas a recibir {QUE_DEJAS_DE_RECIBIR[listo]}.
          </p>
          <p className="text-texto-secundario">
            Podés volver a activarlos cuando quieras desde Mi cuenta, en Preferencias de email.
          </p>
          <Boton href="/ingresar" variante="secundario" bloque>
            Ir a LabÍA
          </Boton>
        </>
      ) : carga && t ? (
        <form action={confirmarBaja} className="flex flex-col gap-4">
          <input type="hidden" name="t" value={t} />
          <p>
            Vas a dejar de recibir {QUE_DEJAS_DE_RECIBIR[carga.categoria]}. Los avisos de tu cuenta
            y de tus trabajos en curso te siguen llegando.
          </p>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-error">
              No pudimos darte de baja. Probá de nuevo en unos minutos.
            </p>
          ) : null}
          <BotonConfirmarBaja />
        </form>
      ) : (
        <>
          <p role="alert" className="font-semibold text-error">
            Este enlace no es válido o está incompleto.
          </p>
          <p className="text-texto-secundario">
            Ingresá a tu cuenta y cambiá tus preferencias desde Mi cuenta.
          </p>
          <Boton href="/ingresar" variante="cliente" tamano="grande" bloque>
            Ingresar
          </Boton>
        </>
      )}
    </>
  );
}

export default function Baja(props: { searchParams: Promise<Params> }) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <h1 className="font-titulo text-[28px] lg:text-4xl">Darte de baja de los emails</h1>
      <Suspense fallback={null}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
