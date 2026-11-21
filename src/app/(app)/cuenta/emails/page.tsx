import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioPreferenciasEmail } from "@/components/cuenta/FormularioPreferenciasEmail";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Preferencias de email · Oficio Seguro" };

export default async function PreferenciasEmail() {
  const sesion = await obtenerSesion();

  let trabajosCerca = true;
  let novedades = true;
  if (sesion && supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase
      .from("preferencias_email")
      .select("trabajos_cerca, novedades")
      .eq("usuario_id", sesion.usuario.id)
      .maybeSingle();
    trabajosCerca = data?.trabajos_cerca ?? true;
    novedades = data?.novedades ?? true;
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <header className="flex flex-col">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-bold text-texto"
        >
          <ArrowLeft aria-hidden strokeWidth={3} className="size-5" />
          Mi cuenta
        </Link>
        <h1 className="mt-0.5 font-titulo text-[36px] leading-none lg:text-[48px]">
          Qué emails te mandamos
        </h1>
        <p className="mt-2 text-base text-texto">
          {sesion?.usuario.email
            ? `Van a ${sesion.usuario.email}. Nunca mandamos publicidad.`
            : "Elegí qué avisos querés recibir en tu correo. Nunca mandamos publicidad."}
        </p>
      </header>
      <FormularioPreferenciasEmail
        trabajosCerca={trabajosCerca}
        novedades={novedades}
        mostrarTrabajosCerca={sesion?.rol === "profesional"}
      />
    </div>
  );
}
