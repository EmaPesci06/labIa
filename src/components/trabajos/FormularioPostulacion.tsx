"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { formatearPesos } from "@/lib/formato";
import { postularme } from "@/lib/trabajos/acciones";
import type { EstadoPostulacion as TipoEstadoPostulacion } from "@/lib/trabajos/consulta";

import { BotonRetirarPostulacion } from "./BotonRetirarPostulacion";

type MiPostulacionInfo = {
  id: string;
  mensaje: string;
  precioEstimado: number | null;
  senaPropuesta: number | null;
  estado: TipoEstadoPostulacion;
  createdAt: string;
};

type FormularioPostulacionProps = {
  trabajoId: string;
  clienteNombre: string;
  trabajoEstado?: string;
  publicado?: boolean;
  miPostulacion?: MiPostulacionInfo | null;
};

/**
 * Formulario para que el profesional se postule a un trabajo.
 * Contempla:
 * - Trabajo cerrado: "Este trabajo ya no recibe postulaciones."
 * - Profesional en revisión: tarjeta deshabilitada con "Vas a poder postularte cuando aprobemos tus documentos."
 * - Ya postulado / postulación recién enviada: tarjeta verde de éxito, detalle y botón para retirar.
 * - Formulario con validación de mensaje, precio estimado y seña propuesta.
 */
export function FormularioPostulacion({
  trabajoId,
  clienteNombre,
  trabajoEstado = "abierto",
  publicado = true,
  miPostulacion: postulacionInicial = null,
}: FormularioPostulacionProps) {
  const [estado, accion, isPending] = useActionState(postularme.bind(null, trabajoId), {});

  // 1. Trabajo no abierto
  if (trabajoEstado !== "abierto") {
    return (
      <div className="flex flex-col gap-4 rounded-[18px] border border-divisor bg-superficie p-5">
        <p className="text-center text-sm font-semibold text-texto-secundario">
          Este trabajo ya no recibe postulaciones.
        </p>
        {postulacionInicial ? (
          <div className="rounded-xl border border-divisor bg-superficie-elevada p-4 text-texto">
            <p className="text-xs font-semibold tracking-wider text-texto-secundario uppercase">
              Tu postulación previa
            </p>
            <p className="mt-1 text-sm whitespace-pre-line">{postulacionInicial.mensaje}</p>
            {postulacionInicial.precioEstimado !== null ||
            postulacionInicial.senaPropuesta !== null ? (
              <div className="mt-3 flex flex-wrap gap-4 border-t border-divisor pt-2 text-xs">
                {postulacionInicial.precioEstimado !== null ? (
                  <div>
                    <span className="text-texto-secundario">Precio estimado: </span>
                    <span className="font-bold text-texto">
                      {formatearPesos(postulacionInicial.precioEstimado)}
                    </span>
                  </div>
                ) : null}
                {postulacionInicial.senaPropuesta !== null ? (
                  <div>
                    <span className="text-texto-secundario">Seña propuesta: </span>
                    <span className="font-bold text-texto">
                      {formatearPesos(postulacionInicial.senaPropuesta)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  // 2. Profesional en revisión (no publicado)
  if (!publicado) {
    return (
      <div className="flex flex-col gap-3 rounded-[18px] border border-borde bg-superficie p-5">
        <h2 className="font-titulo text-lg font-bold text-texto">Postularme</h2>
        <p className="text-sm font-semibold text-texto-secundario">
          Vas a poder postularte cuando aprobemos tus documentos.
        </p>
      </div>
    );
  }

  // 3. Postulación ya enviada previamente
  if (postulacionInicial) {
    return (
      <div className="flex flex-col gap-3 rounded-[18px] bg-exito-suave p-5 text-sobre-exito-suave">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Check aria-hidden strokeWidth={2.5} className="size-5 shrink-0" />
          <span>Postulación enviada</span>
        </div>
        <p className="text-[15px] leading-relaxed">
          {clienteNombre} ve tu mensaje y, si te elige, te escribe por WhatsApp.
        </p>

        <div className="mt-1 rounded-xl border border-borde/50 bg-superficie p-4 text-texto">
          <p className="text-xs font-semibold tracking-wider text-texto-secundario uppercase">
            Tu postulación
          </p>
          <p className="mt-1.5 text-sm whitespace-pre-line text-texto">
            {postulacionInicial.mensaje}
          </p>
          {postulacionInicial.precioEstimado !== null ||
          postulacionInicial.senaPropuesta !== null ? (
            <div className="mt-3 flex flex-wrap gap-4 border-t border-divisor pt-2 text-xs">
              {postulacionInicial.precioEstimado !== null ? (
                <div>
                  <span className="text-texto-secundario">Precio estimado: </span>
                  <span className="font-bold text-texto">
                    {formatearPesos(postulacionInicial.precioEstimado)}
                  </span>
                </div>
              ) : null}
              {postulacionInicial.senaPropuesta !== null ? (
                <div>
                  <span className="text-texto-secundario">Seña propuesta: </span>
                  <span className="font-bold text-texto">
                    {formatearPesos(postulacionInicial.senaPropuesta)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {postulacionInicial.estado === "enviada" ? (
          <div className="pt-1">
            <BotonRetirarPostulacion postulacionId={postulacionInicial.id} />
          </div>
        ) : null}

        <Link
          href="/trabajos"
          className="mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-superficie text-[15px] font-bold text-sobre-exito-suave transition-colors hover:bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Ver más trabajos
        </Link>
      </div>
    );
  }

  // 4. Postulación recién enviada con éxito en esta sesión
  if (estado.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-[18px] bg-exito-suave p-5 text-sobre-exito-suave">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Check aria-hidden strokeWidth={2.5} className="size-5 shrink-0" />
          <span>Postulación enviada</span>
        </div>
        <p className="text-[15px] leading-relaxed">
          {clienteNombre} ve tu mensaje y, si te elige, te escribe por WhatsApp.
        </p>
        <Link
          href="/trabajos"
          className="mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-superficie text-[15px] font-bold text-sobre-exito-suave transition-colors hover:bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          Ver más trabajos
        </Link>
      </div>
    );
  }

  // 5. Formulario de postulación abierto
  return (
    <form
      action={accion}
      noValidate
      className="flex flex-col gap-4 rounded-[18px] border border-borde bg-superficie p-5"
    >
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <h2 className="font-titulo text-lg font-bold text-texto">Postularme</h2>

      {estado.mensaje ? (
        <p className="rounded-lg bg-naranja-suave p-3 text-sm font-semibold text-sobre-naranja-suave">
          {estado.mensaje}
        </p>
      ) : null}

      <Campo
        variante="area"
        name="mensaje"
        etiqueta={`Mensaje para ${clienteNombre}`}
        placeholder="Puedo ir hoy a las 17 h. Reviso la pérdida y te paso presupuesto."
        maxLength={500}
        defaultValue={estado.valores?.mensaje ?? ""}
        error={estado.errores?.mensaje}
        required
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo
          variante="pesos"
          name="precioEstimado"
          etiqueta="Precio estimado"
          placeholder=""
          defaultValue={estado.valores?.precioEstimado ?? ""}
          error={estado.errores?.precioEstimado}
        />
        <Campo
          variante="pesos"
          name="senaPropuesta"
          etiqueta="Seña que proponés"
          placeholder=""
          defaultValue={estado.valores?.senaPropuesta ?? ""}
          error={estado.errores?.senaPropuesta}
        />
      </div>

      <p className="text-xs leading-relaxed text-texto-terciario">
        La seña se acuerda con el cliente y queda escrita en el presupuesto. LabÍA no cobra ni
        retiene pagos.
      </p>

      <Boton
        type="submit"
        variante="profesional"
        tamano="grande"
        cargando={isPending}
        className="mt-1"
      >
        Enviar postulación
      </Boton>
    </form>
  );
}
