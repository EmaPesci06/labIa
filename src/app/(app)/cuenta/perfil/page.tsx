import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FotoDePerfil } from "@/components/cuenta/FotoDePerfil";
import { FormularioPerfil } from "@/components/perfil/FormularioPerfil";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mi perfil público · LabÍA" };

/** Edición del perfil profesional. Solo para cuentas de profesional; el resto vuelve a su cuenta. */
export default async function EditarPerfil() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/ingresar?volver=%2Fcuenta%2Fperfil");
  if (sesion.rol !== "profesional") redirect("/cuenta");

  if (!supabaseConfigurado()) {
    return <Aviso mensaje="No pudimos cargar tu perfil. Probá de nuevo más tarde." />;
  }

  const supabase = await crearClienteServidor();
  const [{ data: perfil }, { data: barrios }, { data: filaUsuario }] = await Promise.all([
    supabase
      .from("perfiles_profesionales")
      .select(
        "oficios, especialidades, descripcion, anios_experiencia, disponibilidad, toda_la_ciudad, zonas",
      )
      .eq("usuario_id", sesion.usuario.id)
      .maybeSingle(),
    supabase.from("barrios").select("id, nombre").order("nombre"),
    supabase.from("usuarios").select("foto_path").eq("id", sesion.usuario.id).maybeSingle(),
  ]);

  if (!perfil) {
    return (
      <Aviso mensaje="Todavía no tenés un perfil profesional. Completá tu registro primero." />
    );
  }

  const foto = filaUsuario?.foto_path
    ? supabase.storage.from("fotos").getPublicUrl(filaUsuario.foto_path).data.publicUrl
    : null;
  const hrefPerfil = `/profesionales/${sesion.usuario.id}`;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3.5">
      <header className="flex flex-col">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-bold text-texto"
        >
          <ArrowLeft aria-hidden strokeWidth={3} className="size-5" />
          Mi cuenta
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-titulo text-[34px] leading-none lg:text-[48px]">Mi perfil público</h1>
          <Link
            href={hrefPerfil}
            className="inline-flex min-h-11 items-center text-[15px] font-bold text-texto underline decoration-2 underline-offset-4"
          >
            Ver cómo se ve
          </Link>
        </div>
      </header>

      <FotoDePerfil uid={sesion.usuario.id} nombre={sesion.perfil.nombreVisible} fotoUrl={foto} />

      <FormularioPerfil
        hrefPerfil={hrefPerfil}
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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
      <header className="flex flex-col">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-bold text-texto"
        >
          <ArrowLeft aria-hidden strokeWidth={3} className="size-5" />
          Mi cuenta
        </Link>
        <h1 className="mt-0.5 font-titulo text-[34px] leading-none lg:text-[48px]">
          Mi perfil público
        </h1>
      </header>
      <Tarjeta>
        <p className="text-texto">{mensaje}</p>
      </Tarjeta>
    </div>
  );
}
