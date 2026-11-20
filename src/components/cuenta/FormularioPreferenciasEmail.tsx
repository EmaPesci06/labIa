"use client";

import { useActionState } from "react";

import { Checkbox } from "@/components/shadcn/checkbox";
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
      className="flex min-h-11 cursor-pointer items-center justify-between gap-3.5 rounded-[20px] bg-superficie px-4 py-3.5 text-texto"
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <span id={`${id}-t`} className="text-[17px] font-bold">
          {titulo}
        </span>
        <span id={`${id}-d`} className="text-sm text-texto">
          {descripcion}
        </span>
      </span>
      <Checkbox
        id={id}
        name={name}
        role="switch"
        defaultChecked={marcado}
        aria-labelledby={`${id}-t`}
        aria-describedby={`${id}-d`}
        className="size-7 shrink-0 cursor-pointer border-2 border-texto bg-campo"
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
    <form action={accion} className="flex flex-col gap-2.5">
      {mostrarTrabajosCerca ? (
        <Interruptor
          name="trabajos_cerca"
          titulo="Trabajos nuevos en mi zona"
          descripcion="Cuando publican algo de tus oficios cerca tuyo."
          marcado={trabajosCerca}
        />
      ) : null}
      <Interruptor
        name="novedades"
        titulo="Novedades y recordatorios"
        descripcion="Pedidos de reseña y avisos cuando eligen a otro profesional."
        marcado={novedades}
      />
      <div className="flex flex-col gap-0.5 rounded-[20px] border-[3px] border-dashed border-texto px-4 py-3.5 text-texto">
        <span className="text-[17px] font-bold">Avisos de tu cuenta</span>
        <span className="text-sm leading-snug">
          Verificación, seguridad, postulaciones y cambios en las normas. Estos llegan siempre: no
          se pueden apagar.
        </span>
      </div>
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-bold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p role="status" className="text-sm font-bold text-texto">
          {estado.exito}
        </p>
      ) : null}
      <div className="rounded-t-[28px] bg-superficie px-5 pt-2.5 pb-4 lg:rounded-tarjeta lg:p-4">
        <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
          Guardar preferencias
        </Boton>
      </div>
    </form>
  );
}
