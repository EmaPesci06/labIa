import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FotoDePerfil } from "@/components/cuenta/FotoDePerfil";
import { FormularioDatos, SeccionComoIngresas } from "@/components/cuenta/FormulariosCuenta";
import { listarBarrios } from "@/lib/barrios";
import { tieneContrasena } from "@/lib/cuenta/proveedor";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mis datos · LabÍA" };

export default async function MisDatos() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;

  let whatsapp = "";
  let barrio = "";
  let foto: string | null = null;
  let conContrasena = false;
  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const [{ data: fila }, { data: auth }] = await Promise.all([
      supabase
        .from("usuarios")
        .select("whatsapp, barrio_id, foto_path")
        .eq("id", sesion.usuario.id)
        .maybeSingle(),
      supabase.auth.getUser(),
    ]);
    whatsapp = fila?.whatsapp ?? "";
    barrio = fila?.barrio_id ? String(fila.barrio_id) : "";
    foto = fila?.foto_path
      ? supabase.storage.from("fotos").getPublicUrl(fila.foto_path).data.publicUrl
      : null;
    conContrasena = auth.user ? tieneContrasena(auth.user) : false;
  }
  const barrios = await listarBarrios();
  const nombreCompleto = [sesion.perfil.nombre, sesion.perfil.apellido].filter(Boolean).join(" ");

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
        <h1 className="mt-0.5 font-titulo text-[38px] leading-none lg:text-[48px]">Mis datos</h1>
      </header>

      {sesion.rol === "profesional" ? null : (
        <FotoDePerfil uid={sesion.usuario.id} nombre={sesion.perfil.nombreVisible} fotoUrl={foto} />
      )}

      <FormularioDatos barrios={barrios} inicial={{ nombreCompleto, whatsapp, barrio }} />

      <SeccionComoIngresas emailActual={sesion.usuario.email ?? ""} conContrasena={conContrasena} />
    </div>
  );
}
