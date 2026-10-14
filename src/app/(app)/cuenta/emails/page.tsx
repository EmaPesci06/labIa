import type { Metadata } from "next";

import { FormularioPreferenciasEmail } from "@/components/cuenta/FormularioPreferenciasEmail";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Preferencias de email · LabÍA" };

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
    <div className="flex max-w-xl flex-col gap-4">
      <h1 className="font-titulo text-[28px] lg:text-4xl">Preferencias de email</h1>
      <p className="text-texto-secundario">Elegí qué avisos querés recibir en tu correo.</p>
      <FormularioPreferenciasEmail
        trabajosCerca={trabajosCerca}
        novedades={novedades}
        mostrarTrabajosCerca={sesion?.rol === "profesional"}
      />
    </div>
  );
}
