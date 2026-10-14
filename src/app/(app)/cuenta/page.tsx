import {
  BadgeCheck,
  BriefcaseBusiness,
  Download,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";

import { BotonSalir } from "@/components/auth/BotonSalir";
import { FilaEnlace, FilaLibre, GrupoCuenta } from "@/components/cuenta/FilaCuenta";
import { SelectorTema } from "@/components/SelectorTema";
import { Avatar } from "@/components/ui/Avatar";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mi cuenta · LabÍA" };

const ICONO = "size-5 shrink-0 text-azul";

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
  const { barrio, foto } = await datosDeEncabezado(sesion.usuario.id);
  const soporte = process.env.EMAIL_SOPORTE || null;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="sr-only">Mi cuenta</h1>

      <header className="flex items-center gap-4">
        <Avatar nombre={sesion.perfil.nombreVisible} src={foto} tamano={84} />
        <div className="min-w-0">
          <p className="truncate font-titulo text-2xl lg:text-[28px]">
            {sesion.perfil.nombreVisible}
          </p>
          <p className="text-[15px] text-texto-secundario">
            {esProfesional ? "Profesional" : "Cliente"}
            {barrio ? ` · ${barrio}` : ""}
          </p>
        </div>
      </header>

      <GrupoCuenta titulo="Tu cuenta">
        <FilaEnlace href="/cuenta/datos" icono={<UserRound aria-hidden className={ICONO} />}>
          Mis datos
        </FilaEnlace>
        {esProfesional ? (
          <>
            <FilaEnlace
              href="/cuenta/perfil"
              icono={<BriefcaseBusiness aria-hidden className={ICONO} />}
            >
              Mi perfil profesional
            </FilaEnlace>
            <FilaEnlace
              href="/cuenta/verificacion"
              icono={<BadgeCheck aria-hidden className={ICONO} />}
            >
              Verificación
            </FilaEnlace>
          </>
        ) : null}
        <FilaEnlace href="/cuenta/emails" icono={<Mail aria-hidden className={ICONO} />}>
          Emails
        </FilaEnlace>
        <FilaLibre>
          <SelectorTema />
        </FilaLibre>
      </GrupoCuenta>

      <GrupoCuenta titulo="Información">
        <FilaEnlace href="/normas" icono={<ShieldCheck aria-hidden className={ICONO} />}>
          Normas de seguridad
        </FilaEnlace>
        <FilaEnlace href="/terminos" icono={<FileText aria-hidden className={ICONO} />}>
          Términos
        </FilaEnlace>
        <FilaEnlace href="/privacidad" icono={<Lock aria-hidden className={ICONO} />}>
          Privacidad
        </FilaEnlace>
      </GrupoCuenta>

      <GrupoCuenta titulo="Ayuda">
        <FilaLibre className="text-[15px] leading-snug">
          <p>
            ¿Necesitás ayuda?{" "}
            {soporte ? (
              <>
                Escribinos a{" "}
                <a
                  href={`mailto:${soporte}`}
                  className="font-semibold text-azul underline underline-offset-2"
                >
                  {soporte}
                </a>
                .
              </>
            ) : (
              "Escribinos por mail a soporte."
            )}
          </p>
          <p className="mt-2 font-semibold">Si estás en peligro, llamá al 911.</p>
        </FilaLibre>
      </GrupoCuenta>

      <GrupoCuenta titulo="Tus datos">
        <FilaEnlace
          href="/api/cuenta/datos"
          descarga
          icono={<Download aria-hidden className={ICONO} />}
        >
          Descargar mis datos
        </FilaEnlace>
        <FilaEnlace
          href="/cuenta/borrar"
          peligro
          icono={<Trash2 aria-hidden className="size-5 shrink-0" />}
        >
          Borrar mi cuenta
        </FilaEnlace>
      </GrupoCuenta>

      <div className="rounded-[18px] border border-divisor bg-superficie p-1">
        <BotonSalir />
      </div>
    </div>
  );
}
