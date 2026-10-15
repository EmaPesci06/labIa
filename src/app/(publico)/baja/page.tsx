import type { Metadata } from "next";
import { Suspense } from "react";

import { BajaDesdeFragmento } from "@/components/emails/BajaDesdeFragmento";
import { FormularioBaja, TEXTO_CATEGORIA } from "@/components/emails/FormularioBaja";
import { Boton } from "@/components/ui/Boton";
import { secretoValido, verificarTokenBaja } from "@/lib/emails/token";

export const metadata: Metadata = { title: "Darte de baja · LabÍA", robots: { index: false } };

type Params = { t?: string; listo?: string; error?: string };

/** El enlace no es válido: se muestra cuando no hay token o la firma no cierra. */
function EnlaceInvalido() {
  return (
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
  );
}

/**
 * Baja desde el link de un email, sin ingresar. Pide confirmar con un botón (en vez de bajar al
 * abrir el link) para que los antivirus y las vistas previas de los correos no te den de baja solos.
 *
 * El token de los emails nuevos va en el fragmento (`/baja#t=`) y lo lee el navegador. Los links ya
 * enviados (`/baja?t=`) siguen funcionando por la query (LAB-57, B-01).
 */
async function Contenido({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, listo, error } = await searchParams;

  if (listo && listo in TEXTO_CATEGORIA) {
    return (
      <>
        <p
          role="status"
          className="rounded-campo bg-exito-suave p-4 font-semibold text-sobre-exito-suave"
        >
          Listo. Ya no vas a recibir {TEXTO_CATEGORIA[listo as keyof typeof TEXTO_CATEGORIA]}.
        </p>
        <p className="text-texto-secundario">
          Podés volver a activarlos cuando quieras desde Mi cuenta, en Preferencias de email.
        </p>
        <Boton href="/ingresar" variante="secundario" bloque>
          Ir a LabÍA
        </Boton>
      </>
    );
  }

  // Enlace con el token en la query (emails ya enviados): se verifica acá.
  if (t !== undefined) {
    const secreto = process.env.EMAILS_SECRET;
    const carga = secretoValido(secreto) ? verificarTokenBaja(t, secreto) : null;
    return carga ? (
      <FormularioBaja token={t} categoria={carga.categoria} conError={Boolean(error)} />
    ) : (
      <EnlaceInvalido />
    );
  }

  // Enlace nuevo: el token está en el fragmento, que solo ve el navegador.
  return <BajaDesdeFragmento conError={Boolean(error)} alNoValido={<EnlaceInvalido />} />;
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
