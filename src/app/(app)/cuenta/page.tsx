import type { Metadata } from "next";
import Link from "next/link";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { FilaEnlace, FilaLibre, GrupoCuenta } from "@/components/cuenta/FilaCuenta";
import { FilasProfesional } from "@/components/cuenta/FilasProfesional";
import { SelectorTema } from "@/components/SelectorTema";
import { Avatar } from "@/components/ui/Avatar";
import { obtenerMisVerificaciones } from "@/lib/registro/documentos";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";
import { resumenBannerVerificacion } from "@/lib/verificacion/logica";

export const metadata: Metadata = { title: "Mi cuenta · Oficio Seguro" };

async function datosDeEncabezado(uid: string) {
  if (!supabaseConfigurado()) return { barrio: null, foto: null };
  const supabase = await crearClienteServidor();
  const { data: fila } = await supabase
    .from("usuarios")
    .select("barrio_id, foto_path")
    .eq("id", uid)
    .maybeSingle();
  if (!fila) return { barrio: null, foto: null };
  const { data: barrio } = fila.barrio_id
    ? await supabase.from("barrios").select("nombre").eq("id", fila.barrio_id).maybeSingle()
    : { data: null };
  const foto = fila.foto_path
    ? supabase.storage.from("fotos").getPublicUrl(fila.foto_path).data.publicUrl
    : null;
  return { barrio: barrio?.nombre ?? null, foto };
}

export default async function Cuenta() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const esProfesional = sesion.rol === "profesional";
  // Independientes entre sí: juntas (LAB-88).
  const [{ barrio, foto }, verificaciones] = await Promise.all([
    datosDeEncabezado(sesion.usuario.id),
    esProfesional ? obtenerMisVerificaciones() : null,
  ]);
  const soporte = process.env.EMAIL_SOPORTE || null;
  const resumen = verificaciones ? resumenBannerVerificacion(verificaciones) : null;

  return (
    <>
      <header
        data-encabezado="turquesa"
        className="flex items-center gap-4 rounded-b-[28px] bg-encabezado py-5 text-sobre-encabezado lg:rounded-b-[40px] lg:py-8"
      >
        <Avatar
          nombre={sesion.perfil.nombreVisible}
          src={foto}
          tamano={84}
          className="size-[76px] border-[5px] bg-equipo text-[32px] text-sobre-encabezado"
        />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-titulo text-[32px] leading-none lg:text-[44px]">
            {sesion.perfil.nombreVisible}
          </h1>
          <p className="mt-1 text-base">
            <span>{esProfesional ? "Profesional" : "Cliente"}</span>
            {barrio ? ` · ${barrio}` : null}
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 pt-3.5 lg:gap-4 lg:pt-6">
        {resumen ? (
          <Link
            href="/cuenta/verificacion"
            className="flex flex-col gap-0.5 rounded-[20px] bg-destacado px-4 py-3 text-sobre-destacado"
          >
            <span className="text-[17px] font-bold">
              {resumen.tipo === "rechazado"
                ? "Hay un documento para volver a subir"
                : "Estamos revisando tus documentos"}
            </span>
            <span className="text-[15px]">
              {resumen.tipo === "rechazado"
                ? `${resumen.documento}: ${resumen.motivo}. Tu perfil no se publica hasta que lo revisemos.`
                : "Tu perfil no se publica hasta que lo revisemos."}
            </span>
          </Link>
        ) : null}

        <GrupoCuenta etiqueta="Mi cuenta">
          <FilaEnlace href="/cuenta/datos">Mis datos</FilaEnlace>
          {esProfesional ? <FilasProfesional /> : null}
          <FilaEnlace href="/cuenta/emails">Preferencias de email</FilaEnlace>
        </GrupoCuenta>

        <SelectorTema etiqueta="Aspecto" className="rounded-[20px] bg-superficie px-4 py-3" />

        <GrupoCuenta etiqueta="Legales">
          <FilaEnlace href="/normas" compacta conFlecha={false}>
            Normas de seguridad
          </FilaEnlace>
          <FilaEnlace href="/terminos" compacta conFlecha={false}>
            Términos y privacidad
          </FilaEnlace>
          <FilaEnlace href="/api/cuenta/datos" descarga compacta conFlecha={false}>
            Descargar mis datos
          </FilaEnlace>
        </GrupoCuenta>

        <GrupoCuenta etiqueta="Ayuda" como="section">
          <FilaLibre className="text-[15px] leading-snug text-texto">
            <p>
              ¿Necesitás ayuda?{" "}
              {soporte ? (
                <>
                  Escribinos a{" "}
                  <a
                    href={`mailto:${soporte}`}
                    className="font-bold text-texto underline decoration-2 underline-offset-2"
                  >
                    {soporte}
                  </a>
                  .
                </>
              ) : (
                "Escribinos por mail a soporte."
              )}
            </p>
            <p className="mt-2 font-bold">Si estás en peligro, llamá al 911.</p>
          </FilaLibre>
        </GrupoCuenta>

        {!esProfesional ? (
          <div className="flex flex-col gap-0.5 rounded-[20px] border-[3px] border-dashed border-texto px-4 py-3.5">
            <span className="text-[17px] font-bold">¿Ofrecés un oficio?</span>
            <span className="text-[15px]">
              Para trabajar en Oficio Seguro necesitás una cuenta de profesional.
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <BotonSalir className="min-w-11 px-1 text-base font-bold underline decoration-2 underline-offset-4 hover:bg-transparent [&_svg]:hidden" />
          <Link
            href="/cuenta/borrar"
            className="inline-flex min-h-11 items-center text-base font-bold text-error underline decoration-2 underline-offset-4"
          >
            Borrar mi cuenta
          </Link>
        </div>
      </div>
    </>
  );
}
