"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { guardarPreferenciasEmail } from "@/lib/emails/acciones";

type Props = {
  trabajosCerca: boolean;
  novedades: boolean;
  /** Solo los profesionales reciben el resumen de trabajos nuevos. */
  mostrarTrabajosCerca: boolean;
};

function Interruptor({
  name,
  titulo,
  descripcion,
  marcado,
}: {
  name: string;
  titulo: string;
  descripcion: string;
  marcado: boolean;
}) {
  const id = `pref-${name}`;
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start justify-between gap-4 rounded-boton border border-borde bg-superficie p-4"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-bold">{titulo}</span>
        <span id={`${id}-d`} className="text-sm text-texto-secundario">
          {descripcion}
        </span>
      </span>
      <input
        id={id}
        name={name}
        type="checkbox"
        role="switch"
        defaultChecked={marcado}
        aria-describedby={`${id}-d`}
        className="after:bg-white relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-borde transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:transition-transform checked:bg-azul checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  );
}

export function FormularioPreferenciasEmail({
  trabajosCerca,
  novedades,
  mostrarTrabajosCerca,
}: Props) {
  const [estado, accion, pendiente] = useActionState(guardarPreferenciasEmail, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-3">
      {mostrarTrabajosCerca ? (
        <Interruptor
          name="trabajos_cerca"
          titulo="Trabajos nuevos cerca tuyo"
          descripcion="Un resumen por día, a las 8, con los pedidos de tus oficios y zonas."
          marcado={trabajosCerca}
        />
      ) : null}
      <Interruptor
        name="novedades"
        titulo="Novedades y recordatorios"
        descripcion="Pedidos de reseña y avisos cuando eligen a otro profesional."
        marcado={novedades}
      />
      <p className="text-sm text-texto-secundario">
        Los avisos de tu cuenta y de tus trabajos en curso (perfil aprobado, postulaciones, te
        eligieron) te llegan siempre.
      </p>
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-semibold text-exito">
          {estado.exito}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Guardar
      </Boton>
    </form>
  );
}
