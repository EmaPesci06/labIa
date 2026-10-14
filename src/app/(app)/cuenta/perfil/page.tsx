import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioPerfil } from "@/components/perfil/FormularioPerfil";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Editar perfil · LabÍA" };

/** Edición del perfil profesional. Solo para cuentas de profesional; el resto vuelve a su cuenta. */
export default async function EditarPerfil() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=%2Fcuenta%2Fperfil");
  if (sesion.rol !== "profesional") redirect("/cuenta");

  if (!supabaseConfigurado()) {
    return <Aviso mensaje="No pudimos cargar tu perfil. Probá de nuevo más tarde." />;
  }

  const supabase = await crearClienteServidor();
  const [{ data: perfil }, { data: barrios }] = await Promise.all([
    supabase
      .from("perfiles_profesionales")
      .select(
        "oficios, especialidades, descripcion, anios_experiencia, disponibilidad, toda_la_ciudad, zonas",
      )
      .eq("usuario_id", sesion.usuario.id)
      .maybeSingle(),
    supabase.from("barrios").select("id, nombre").order("nombre"),
  ]);

  if (!perfil) {
    return (
      <Aviso mensaje="Todavía no tenés un perfil profesional. Completá tu registro primero." />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-titulo text-[28px] lg:text-4xl">Editar perfil</h1>
      <FormularioPerfil
        hrefPerfil={`/profesionales/${sesion.usuario.id}`}
        barrios={barrios ?? []}
        valores={{
          oficios: perfil.oficios,
          especialidades: perfil.especialidades ?? "",
          descripcion: perfil.descripcion ?? "",
          aniosExperiencia:
            perfil.anios_experiencia === null || perfil.anios_experiencia === undefined
              ? ""
              : String(perfil.anios_experiencia),
          disponibilidad: perfil.disponibilidad ?? "",
          todaLaCiudad: perfil.toda_la_ciudad,
          zonas: perfil.zonas,
        }}
      />
    </div>
  );
}

function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-titulo text-[28px] lg:text-4xl">Editar perfil</h1>
      <p className="text-texto-secundario">{mensaje}</p>
    </div>
  );
}
