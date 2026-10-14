import { ChevronLeft, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioBorrar } from "@/components/cuenta/FormularioBorrar";
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
  "Tu perfil profesional, tu foto y las fotos de tus trabajos.",
  "Tus documentos de verificación (DNI, antecedentes y matrícula).",
  "Tus postulaciones y tus contactos con clientes.",
  "Las reseñas que recibiste.",
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/cuenta"
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-campo pr-3 text-[15px] font-bold text-azul"
        >
          <ChevronLeft aria-hidden strokeWidth={2} className="size-5" />
          Mi cuenta
        </Link>
        <h1 className="font-titulo text-[28px] lg:text-4xl">Borrar mi cuenta</h1>
        <p className="text-texto-secundario">
          Esto no se puede deshacer. Borramos todo de verdad, incluidos tus archivos.
        </p>
      </div>

      {enCurso.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[14px] bg-naranja-suave p-3.5 text-sm leading-snug text-sobre-naranja-suave"
        >
          <TriangleAlert aria-hidden strokeWidth={2} className="size-[22px] shrink-0" />
          <ul className="flex flex-col gap-1 font-semibold">
            {enCurso.map((nombre, i) => (
              <li key={i}>
                Tenés un trabajo en curso con {nombre}. Si borrás tu cuenta, se cancela.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="flex flex-col gap-2" aria-labelledby="que-se-borra">
        <h2 id="que-se-borra" className="font-titulo text-xl">
          Qué se borra
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-snug">
          {(esProfesional ? SE_BORRA_PROFESIONAL : SE_BORRA_CLIENTE).map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
        {!esProfesional ? null : (
          <p className="text-sm text-texto-secundario">
            Los trabajos en curso con clientes se cancelan.
          </p>
        )}
        <p className="text-[15px] leading-snug">
          <strong>Las reseñas que escribiste</strong> quedan, pero anónimas (“Cliente de LabÍA”),
          para no alterar el promedio de cada profesional.
        </p>
      </section>

      <FormularioBorrar pedirContrasena={pedirContrasena} />
    </div>
  );
}
