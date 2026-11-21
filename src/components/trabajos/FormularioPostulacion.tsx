"use client";

import { Check } from "lucide-react";
import { useActionState, useId, type ReactNode } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatearPesos } from "@/lib/formato";
import { postularme } from "@/lib/trabajos/acciones";
import type { EstadoPostulacion as TipoEstadoPostulacion } from "@/lib/trabajos/consulta";

import { BotonRetirarPostulacion } from "./BotonRetirarPostulacion";

export type MiPostulacionInfo = {
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

/** Título y detalle de cada estado de la postulación, desde el punto de vista del profesional. */
const TEXTO_ESTADO: Record<
  TipoEstadoPostulacion,
  { titulo: string; detalle: (cliente: string) => string; icono: boolean }
> = {
  enviada: {
    titulo: "Postulación enviada",
    detalle: (cliente) => `${cliente} ve tu mensaje y, si te elige, te escribe por WhatsApp.`,
    icono: true,
  },
  elegida: {
    titulo: "Te eligieron",
    detalle: (cliente) => `${cliente} te va a escribir por WhatsApp.`,
    icono: true,
  },
  descartada: {
    titulo: "Eligieron a otra persona",
    detalle: () =>
      "Esta vez el cliente eligió a otra persona. Seguí postulándote a otros trabajos.",
    icono: false,
  },
  retirada: {
    titulo: "Retiraste tu postulación",
    detalle: () => "El cliente ya no la tiene en cuenta.",
    icono: false,
  },
};

/**
 * Formulario para que el profesional se postule a un trabajo, y el resumen de su postulación
 * según el estado (enviada, elegida, descartada, retirada). Contempla:
 * - Trabajo cerrado: "Este trabajo ya no recibe postulaciones."
 * - Profesional en revisión: tarjeta deshabilitada con "Vas a poder postularte cuando aprobemos tus documentos."
 * - Ya postulado o recién enviado: resumen con el texto de su estado y, si está enviada, "Retirar".
 * - Formulario con validación de mensaje, precio estimado y seña propuesta (bocetos App-TrabajoDetalle y Oscuro-TrabajoDetalle, LAB-78).
 */
export function FormularioPostulacion({
  trabajoId,
  clienteNombre,
  trabajoEstado = "abierto",
  publicado = true,
  miPostulacion: postulacionInicial = null,
}: FormularioPostulacionProps) {
  const [estado, accion, isPending] = useActionState(postularme.bind(null, trabajoId), {});
  const idError = useId();

  // 1. Trabajo no abierto
  if (trabajoEstado !== "abierto") {
    return (
      <Tarjeta className="flex flex-col gap-4 p-5">
        <p className="text-center text-[15px] font-bold text-texto">
          Este trabajo ya no recibe postulaciones.
        </p>
        {postulacionInicial ? (
          <DatosPostulacion postulacion={postulacionInicial} titulo="Tu postulación previa" />
        ) : null}
      </Tarjeta>
    );
  }

  // 2. Profesional en revisión (no publicado)
  if (!publicado) {
    return (
      <Tarjeta className="flex flex-col gap-2 p-5">
        <h2 className="font-titulo text-[22px] leading-tight text-texto">Postularme</h2>
        <p className="text-[15px] font-bold text-texto">
          Vas a poder postularte cuando aprobemos tus documentos.
        </p>
      </Tarjeta>
    );
  }

  // 3. Postulación ya hecha: resumen según su estado
  if (postulacionInicial) {
    return (
      <CajaEstado estado={postulacionInicial.estado} clienteNombre={clienteNombre}>
        <DatosPostulacion postulacion={postulacionInicial} titulo="Tu postulación" />
        {postulacionInicial.estado === "enviada" ? (
          <div className="pt-1">
            <BotonRetirarPostulacion postulacionId={postulacionInicial.id} />
          </div>
        ) : null}
        <Boton href="/trabajos" variante="secundario" bloque className="mt-1">
          Ver más trabajos
        </Boton>
      </CajaEstado>
    );
  }

  // 4. Postulación recién enviada con éxito en esta sesión
  if (estado.ok) {
    return (
      <CajaEstado estado="enviada" clienteNombre={clienteNombre}>
        <Boton href="/trabajos" variante="secundario" bloque className="mt-1">
          Ver más trabajos
        </Boton>
      </CajaEstado>
    );
  }

  // 5. Formulario de postulación abierto
  return (
    <form
      action={accion}
      noValidate
      aria-describedby={estado.mensaje ? idError : undefined}
      className="flex flex-col gap-4"
    >
      <h2 className="font-titulo text-[22px] leading-tight text-texto">Postularme</h2>

      {estado.mensaje ? (
        <p
          id={idError}
          role="alert"
          className="rounded-xl bg-destacado p-3 text-sm font-bold text-sobre-destacado"
        >
          {estado.mensaje}
        </p>
      ) : null}

      <Campo
        variante="area"
        name="mensaje"
        etiqueta={`Tu mensaje para ${clienteNombre}`}
        placeholder="Puedo pasar hoy a las 17. Por lo que contás es el cuerito o el vástago."
        ayuda="No pongas teléfono ni precio final: eso se acuerda por WhatsApp, con presupuesto escrito."
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

      <p className="text-sm leading-snug text-texto">
        La seña se acuerda con el cliente y queda escrita en el presupuesto. Oficio Seguro no cobra
        ni retiene pagos.
      </p>

      <Boton type="submit" variante="principal" tamano="grande" bloque cargando={isPending}>
        Postularme
      </Boton>
    </form>
  );
}

/** Tarjeta con el título y el detalle del estado de la postulación. */
function CajaEstado({
  estado,
  clienteNombre,
  children,
}: {
  estado: TipoEstadoPostulacion;
  clienteNombre: string;
  children: ReactNode;
}) {
  const texto = TEXTO_ESTADO[estado];
  return (
    <Tarjeta className="flex flex-col overflow-hidden border-2 border-borde p-0">
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 font-titulo text-[22px] leading-tight text-texto">
        {texto.icono ? <Check aria-hidden strokeWidth={3} className="size-5 shrink-0" /> : null}
        <span>{texto.titulo}</span>
      </div>
      <div aria-hidden className="corte-cupon" />
      <div className="flex flex-col gap-3 p-5">
        <p className="text-[15px] leading-relaxed text-texto">{texto.detalle(clienteNombre)}</p>
        {children}
      </div>
    </Tarjeta>
  );
}

/** Mensaje, precio estimado y seña propuesta de una postulación. */
function DatosPostulacion({
  postulacion,
  titulo,
}: {
  postulacion: MiPostulacionInfo;
  titulo: string;
}) {
  const tienePrecio = postulacion.precioEstimado !== null;
  const tieneSena = postulacion.senaPropuesta !== null;
  return (
    <div className="rounded-xl bg-fondo p-4 text-texto">
      <p className="text-xs font-bold tracking-[0.4px] text-texto uppercase">{titulo}</p>
      <p className="mt-1.5 text-[15px] whitespace-pre-line text-texto">{postulacion.mensaje}</p>
      {tienePrecio || tieneSena ? (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-superficie pt-2 text-sm">
          {postulacion.precioEstimado !== null ? (
            <div>
              <span className="text-texto">Precio estimado: </span>
              <span className="font-bold text-texto">
                {formatearPesos(postulacion.precioEstimado)}
              </span>
            </div>
          ) : null}
          {postulacion.senaPropuesta !== null ? (
            <div>
              <span className="text-texto">Seña propuesta: </span>
              <span className="font-bold text-texto">
                {formatearPesos(postulacion.senaPropuesta)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
