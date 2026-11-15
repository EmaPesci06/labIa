import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioBorrar } from "@/components/cuenta/FormularioBorrar";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { tieneContrasena } from "@/lib/cuenta/proveedor";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor, supabaseConfigurado } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Borrar mi cuenta · LabÍA" };

/** Nombres de las personas con las que tiene un trabajo en curso (estado `asignado`). */
async function trabajosEnCurso(uid: string, esProfesional: boolean): Promise<string[]> {
  if (!supabaseConfigurado()) return [];
  const supabase = await crearClienteServidor();
  const { data: trabajos } = await supabase
    .from("trabajos")
    .select("cliente_id, profesional_elegido_id")
    .eq("estado", "asignado")
    .eq(esProfesional ? "profesional_elegido_id" : "cliente_id", uid);
  const ids = (trabajos ?? []).flatMap(
    (t) => (esProfesional ? t.cliente_id : t.profesional_elegido_id) ?? [],
  );
  if (ids.length === 0) return [];
  const { data: personas } = await supabase
    .from("usuarios_publicos")
    .select("nombre")
    .in("id", ids);
  return (personas ?? []).map((p) => p.nombre ?? "otra persona");
}

const SE_BORRA_CLIENTE = [
  "Tu perfil y tu foto.",
  "Los trabajos que publicaste, con sus fotos y las postulaciones que recibieron.",
  "Tus contactos con profesionales.",
];
const SE_BORRA_PROFESIONAL = [
  "Tu perfil, tus fotos y tus reseñas.",
  "Tu DNI, tus antecedentes y tu matrícula.",
  "Tus postulaciones y tus datos de contacto.",
  "Los trabajos en curso con clientes se cancelan.",
];

export default async function BorrarCuenta() {
  const sesion = await obtenerSesion();
  if (!sesion) return null;
  const esProfesional = sesion.rol === "profesional";

  let pedirContrasena = true;
  if (supabaseConfigurado()) {
    const supabase = await crearClienteServidor();
    const { data } = await supabase.auth.getUser();
    pedirContrasena = data.user ? tieneContrasena(data.user) : true;
  }
  const enCurso = await trabajosEnCurso(sesion.usuario.id, esProfesional);

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
        <h1 className="mt-0.5 font-titulo text-[38px] leading-none lg:text-[48px]">
          Borrar mi cuenta
        </h1>
        <p className="mt-2 text-[17px] leading-snug font-bold text-error">
          Esto no se puede deshacer. Borramos todo de verdad, incluidos tus archivos.
        </p>
      </header>

      {enCurso.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[14px] bg-sol p-3.5 text-sm leading-snug text-sobre-sol"
        >
          <TriangleAlert aria-hidden strokeWidth={2} className="size-[22px] shrink-0" />
          <ul className="flex flex-col gap-1 font-bold">
            {enCurso.map((nombre, i) => (
              <li key={i}>
                Tenés un trabajo en curso con {nombre}. Si borrás tu cuenta, se cancela.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Tarjeta como="section" aria-labelledby="que-se-borra" className="flex flex-col gap-2">
        <h2 id="que-se-borra" className="font-titulo text-[22px] leading-tight">
          Qué se borra
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-base leading-snug">
          {(esProfesional ? SE_BORRA_PROFESIONAL : SE_BORRA_CLIENTE).map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
        {!esProfesional ? (
          <p className="text-[15px] leading-snug">
            <strong>Las reseñas que escribiste</strong> quedan, pero anónimas (“Cliente de LabÍA”),
            para no alterar el promedio de cada profesional.
          </p>
        ) : null}
      </Tarjeta>

      <a
        href="/api/cuenta/datos"
        download
        className="inline-flex min-h-12 items-center justify-center rounded-boton border-[3px] border-texto bg-transparent px-5 text-base font-bold text-texto hover:bg-superficie"
      >
        Antes, descargar mis datos
      </a>

      <FormularioBorrar pedirContrasena={pedirContrasena} />
    </div>
  );
}
