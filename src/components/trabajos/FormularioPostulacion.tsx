"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, type ReactNode } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { cn } from "@/lib/cn";
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

type TonoEstado = "azul" | "exito" | "neutro";

/** Título y detalle de cada estado de la postulación, desde el punto de vista del profesional. */
const TEXTO_ESTADO: Record<
  TipoEstadoPostulacion,
  { titulo: string; detalle: (cliente: string) => string; tono: TonoEstado; icono: boolean }
> = {
  enviada: {
    titulo: "Postulación enviada",
    detalle: (cliente) => `${cliente} ve tu mensaje y, si te elige, te escribe por WhatsApp.`,
    tono: "azul",
    icono: true,
  },
  elegida: {
    titulo: "¡Te eligieron!",
    detalle: () => "El cliente te va a escribir por WhatsApp.",
    tono: "exito",
    icono: true,
  },
  descartada: {
    titulo: "Eligieron a otro profesional",
    detalle: () =>
      "Esta vez el cliente eligió a otra persona. Seguí postulándote a otros trabajos.",
    tono: "neutro",
    icono: false,
  },
  retirada: {
    titulo: "Retiraste tu postulación",
    detalle: () => "El cliente ya no la tiene en cuenta.",
    tono: "neutro",
    icono: false,
  },
};

const COLOR_TONO: Record<TonoEstado, string> = {
  azul: "bg-azul-suave text-sobre-azul-suave",
  exito: "bg-exito-suave text-sobre-exito-suave",
  neutro: "border border-divisor bg-superficie-elevada text-texto",
};

const CLASE_VER_MAS =
  "mt-2 flex min-h-[48px] items-center justify-center rounded-xl bg-superficie text-[15px] font-bold text-texto transition-colors hover:bg-superficie-elevada focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco";

/**
 * Formulario para que el profesional se postule a un trabajo, y el resumen de su postulación
 * según el estado (enviada, elegida, descartada, retirada). Contempla:
 * - Trabajo cerrado: "Este trabajo ya no recibe postulaciones."
 * - Profesional en revisión: tarjeta deshabilitada con "Vas a poder postularte cuando aprobemos tus documentos."
 * - Ya postulado o recién enviado: resumen con el texto de su estado y, si está enviada, "Retirar".
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
  const idError = useId();

  // 1. Trabajo no abierto
  if (trabajoEstado !== "abierto") {
    return (
      <div className="flex flex-col gap-4 rounded-[18px] border border-divisor bg-superficie p-5">
        <p className="text-center text-sm font-semibold text-texto-secundario">
          Este trabajo ya no recibe postulaciones.
        </p>
        {postulacionInicial ? (
          <DatosPostulacion postulacion={postulacionInicial} titulo="Tu postulación previa" />
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
        <Link href="/trabajos" className={CLASE_VER_MAS}>
          Ver más trabajos
        </Link>
      </CajaEstado>
    );
  }

  // 4. Postulación recién enviada con éxito en esta sesión
  if (estado.ok) {
    return (
      <CajaEstado estado="enviada" clienteNombre={clienteNombre}>
        <Link href="/trabajos" className={CLASE_VER_MAS}>
          Ver más trabajos
        </Link>
      </CajaEstado>
    );
  }

  // 5. Formulario de postulación abierto
  return (
    <form
      action={accion}
      noValidate
      aria-describedby={estado.mensaje ? idError : undefined}
      className="flex flex-col gap-4 rounded-[18px] border border-borde bg-superficie p-5"
    >
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <h2 className="font-titulo text-lg font-bold text-texto">Postularme</h2>

      {estado.mensaje ? (
        <p
          id={idError}
          role="alert"
          className="rounded-lg bg-naranja-suave p-3 text-sm font-semibold text-sobre-naranja-suave"
        >
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
    <div className={cn("flex flex-col gap-3 rounded-[18px] p-5", COLOR_TONO[texto.tono])}>
      <div className="flex items-center gap-2 text-lg font-bold">
        {texto.icono ? <Check aria-hidden strokeWidth={2.5} className="size-5 shrink-0" /> : null}
        <span>{texto.titulo}</span>
      </div>
      <p className="text-[15px] leading-relaxed">{texto.detalle(clienteNombre)}</p>
      {children}
    </div>
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
    <div className="rounded-xl border border-borde/50 bg-superficie p-4 text-texto">
      <p className="text-xs font-semibold tracking-wider text-texto-secundario uppercase">
        {titulo}
      </p>
      <p className="mt-1.5 text-sm whitespace-pre-line text-texto">{postulacion.mensaje}</p>
      {tienePrecio || tieneSena ? (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-divisor pt-2 text-xs">
          {postulacion.precioEstimado !== null ? (
            <div>
              <span className="text-texto-secundario">Precio estimado: </span>
              <span className="font-bold text-texto">
                {formatearPesos(postulacion.precioEstimado)}
              </span>
            </div>
          ) : null}
          {postulacion.senaPropuesta !== null ? (
            <div>
              <span className="text-texto-secundario">Seña propuesta: </span>
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
