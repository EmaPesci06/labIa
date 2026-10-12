import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EncabezadoAuth } from "@/components/auth/EncabezadoAuth";
import { FormularioCompletarCliente } from "@/components/auth/FormularioCompletarCliente";
import { inicioDelRol } from "@/lib/auth/rutas";
import { listarBarrios } from "@/lib/barrios";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Completá tus datos · LabÍA" };

async function Contenido({ searchParams }: PageProps<"/registro/cliente/completar">) {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=%2Fregistro%2Fcliente%2Fcompletar");
  if (sesion.rol !== "cliente") redirect(inicioDelRol(sesion.rol));

  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const { data: fila } = await supabase
      .from("usuarios")
      .select("whatsapp, barrio_id")
      .eq("id", sesion.usuario.id)
      .maybeSingle();
    // Ya tiene todo: no hay nada que completar.
    if (fila?.whatsapp && fila.barrio_id) redirect("/inicio");
  } else {
    redirect("/inicio");
  }

  const consulta = await searchParams;
  const aviso = consulta.aviso === "datos";
  const barrios = await listarBarrios();

  return (
    <>
      {aviso ? (
        <p
          role="alert"
          className="rounded-campo bg-naranja-suave p-3.5 text-sm font-semibold text-sobre-naranja-suave"
        >
          Creamos tu cuenta pero no pudimos guardar tus datos. Completalos acá para seguir.
        </p>
      ) : null}
      <FormularioCompletarCliente barrios={barrios} />
    </>
  );
}

export default function CompletarRegistroCliente(props: PageProps<"/registro/cliente/completar">) {
  return (
    <div className="flex flex-col gap-[18px]">
      <EncabezadoAuth
        titulo="Un último paso"
        bajada="Con tu WhatsApp y tu barrio, los profesionales pueden responderte."
        contexto="Quiero contratar"
      />
      <Suspense fallback={null}>
        <Contenido {...props} />
      </Suspense>
    </div>
  );
}
