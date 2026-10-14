import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  FormularioContrasena,
  FormularioDatos,
  FormularioEmail,
} from "@/components/cuenta/FormulariosCuenta";
import { FotoDePerfil } from "@/components/cuenta/FotoDePerfil";
import { Aviso } from "@/components/ui/Aviso";
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-campo pr-3 text-[15px] font-bold text-azul"
        >
          <ChevronLeft aria-hidden strokeWidth={2} className="size-5" />
          Mi cuenta
        </Link>
        <h1 className="font-titulo text-[28px] lg:text-4xl">Mis datos</h1>
      </div>

      <FotoDePerfil uid={sesion.usuario.id} nombre={sesion.perfil.nombreVisible} fotoUrl={foto} />

      <FormularioDatos barrios={barrios} inicial={{ nombreCompleto, whatsapp, barrio }} />

      <section
        className="flex flex-col gap-3.5 border-t border-divisor pt-6"
        aria-labelledby="acceso"
      >
        <h2 id="acceso" className="font-titulo text-xl">
          Cómo ingresás
        </h2>
        {conContrasena ? (
          <>
            <FormularioEmail emailActual={sesion.usuario.email ?? ""} />
            <FormularioContrasena />
          </>
        ) : (
          <Aviso>
            Ingresás con Google. Tu email y tu contraseña los manejás desde tu cuenta de Google.
          </Aviso>
        )}
      </section>
    </div>
  );
}
