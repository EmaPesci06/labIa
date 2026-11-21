import type { Metadata } from "next";
import { Suspense } from "react";

import { BajaDesdeFragmento } from "@/components/emails/BajaDesdeFragmento";
import { FormularioBaja, TEXTO_CATEGORIA } from "@/components/emails/FormularioBaja";
import { AvisoPantalla } from "@/components/ui/AvisoPantalla";
import { Boton } from "@/components/ui/Boton";
import { secretoValido, verificarTokenBaja } from "@/lib/emails/token";

export const metadata: Metadata = {
  title: "Darte de baja · Oficio Seguro",
  robots: { index: false },
};

type Params = { t?: string; listo?: string; error?: string };

/** El enlace no es válido: se muestra cuando no hay token o la firma no cierra. */
function EnlaceInvalido() {
  return (
    <AvisoPantalla
      nivel={2}
      titulo="Este enlace no es válido o está incompleto."
      texto="Ingresá a tu cuenta y cambiá tus preferencias desde Mi cuenta."
      accion={
        <Boton href="/ingresar" tamano="grande" bloque>
          Ingresar
        </Boton>
      }
      className="min-h-[60dvh] pt-4"
    />
  );
}

/**
 * Baja desde el link de un email, sin ingresar (LAB-30, LAB-80: boceto `App-Aviso`). Pide confirmar
 * con un botón (en vez de bajar al abrir el link) para que los antivirus y las vistas previas de los
 * correos no te den de baja solos.
 *
 * El token de los emails nuevos va en el fragmento (`/baja#t=`) y lo lee el navegador. Los links ya
 * enviados (`/baja?t=`) siguen funcionando por la query (LAB-57, B-01).
 */
async function Contenido({ searchParams }: { searchParams: Promise<Params> }) {
  const { t, listo, error } = await searchParams;

  if (listo && Object.hasOwn(TEXTO_CATEGORIA, listo)) {
    return (
      <AvisoPantalla
        nivel={2}
        titulo="Listo, no te mandamos más estos avisos."
        texto={`Ya no vas a recibir ${TEXTO_CATEGORIA[listo as keyof typeof TEXTO_CATEGORIA]}. Podés volver a activarlos cuando quieras desde Mi cuenta, en Preferencias de email.`}
        accion={
          <Boton href="/ingresar" tamano="grande" bloque>
            Ir a Oficio Seguro
          </Boton>
        }
        className="min-h-[60dvh] pt-4"
      />
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
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="sr-only">Darte de baja de los emails</h1>
      <Suspense fallback={null}>
        <Contenido searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
