"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { CintaDistancia } from "@/components/ui/cinta-metrica";
import { formatearPesos } from "@/lib/formato";
import type { PostulanteParaCliente } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO } from "@/lib/validaciones/trabajo";

import { ModalConfirmacion } from "./ModalConfirmacion";

type Props = {
  postulante: PostulanteParaCliente;
  trabajoId: string;
  trabajoEstado: "abierto" | "asignado" | "cerrado" | "cancelado";
  esElegido: boolean;
  hayElegido: boolean;
  /** Devuelve `true` si la elección salió bien (la hoja se cierra) y `false` si falló (queda abierta con el error). */
  onElegir: (postulacionId: string) => Promise<boolean>;
  pendiente: boolean;
  /** Error de la última elección; se muestra solo en la hoja de este postulante. */
  errorElegir?: string | null;
  onLimpiarErrorElegir?: () => void;
};

/**
 * Tarjeta de un postulante en la vista del cliente (LAB-29, LAB-48).
 * Muestra avatar, nombre, oficio/calificación, distancia, mensaje presupuestario,
 * link al perfil público y botón para elegirlo con confirmación atómica.
 */
export function TarjetaPostulante({
  postulante,
  trabajoEstado,
  esElegido,
  hayElegido,
  onElegir,
  pendiente,
  errorElegir = null,
  onLimpiarErrorElegir,
}: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const botonAbridorRef = useRef<HTMLButtonElement | null>(null);

  const nombreCompleto =
    `${postulante.profesional.nombre} ${postulante.profesional.apellidoInicial}.`.trim();
  const primerOficio = postulante.profesional.oficios[0]
    ? ETIQUETA_OFICIO[postulante.profesional.oficios[0]]
    : "Profesional";
  const matriculadoTexto = postulante.profesional.matriculado ? "matriculado" : "";
  const oficioYMatricula = [primerOficio, matriculadoTexto].filter(Boolean).join(" ");

  const promedioTexto =
    postulante.profesional.promedio > 0
      ? `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(postulante.profesional.promedio)} estrellas`
      : "Sin calificaciones";

  const subtitulo = `${oficioYMatricula} · ${promedioTexto}`;

  // Presupuesto y seña
  const partesPresupuesto: string[] = [];
  if (postulante.precioEstimado !== null) {
    partesPresupuesto.push(`Presupuesto estimado ${formatearPesos(postulante.precioEstimado)}`);
  }
  if (postulante.senaPropuesta !== null) {
    partesPresupuesto.push(`Seña ${formatearPesos(postulante.senaPropuesta)}`);
  }
  const textoPresupuesto = partesPresupuesto.join(" · ");

  async function handleConfirmarEleccion() {
    const salio = await onElegir(postulante.id);
    if (salio) {
      setModalAbierto(false);
    }
  }

  function handleCambioModal(abierta: boolean) {
    setModalAbierto(abierta);
    if (!abierta) onLimpiarErrorElegir?.();
  }

  return (
    <article
      aria-label={`Postulación de ${nombreCompleto}`}
      className="flex flex-col gap-3 rounded-[18px] border border-divisor bg-superficie p-4 text-texto lg:p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar
          nombre={nombreCompleto}
          src={postulante.profesional.fotoPath}
          tamano={44}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-titulo text-base font-bold tracking-tight text-texto lg:text-[17px]">
            {nombreCompleto}
          </span>
          <span className="text-[13px] text-texto-secundario lg:text-sm">{subtitulo}</span>
          {postulante.profesional.distanciaKm !== null ? (
            <div className="mt-1">
              <CintaDistancia km={postulante.profesional.distanciaKm} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[12px] bg-fondo p-3 text-[15px] leading-relaxed text-texto italic">
        “{postulante.mensaje}”
      </div>

      {textoPresupuesto ? (
        <div className="text-sm font-semibold text-texto-secundario">{textoPresupuesto}</div>
      ) : null}

      <div className="mt-1 grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end">
        <Link
          href={`/profesionales/${postulante.profesionalId}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded-boton border-[1.5px] border-azul px-4 text-center text-sm font-bold text-azul transition-colors hover:bg-azul-suave focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco sm:w-auto"
        >
          Ver perfil
        </Link>

        {esElegido ? (
          <span className="inline-flex min-h-[44px] items-center justify-center rounded-boton bg-exito px-4 text-center text-sm font-bold text-sobre-exito sm:w-auto">
            Elegido
          </span>
        ) : trabajoEstado === "abierto" ? (
          <>
            <button
              ref={botonAbridorRef}
              type="button"
              disabled={pendiente}
              onClick={() => setModalAbierto(true)}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-boton bg-naranja-accion px-4 text-center text-sm font-bold text-sobre-naranja transition-opacity hover:opacity-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco active:opacity-90 disabled:opacity-50 sm:w-auto"
            >
              Elegir
            </button>
            <ModalConfirmacion
              abierta={modalAbierto}
              onCambioAbierta={handleCambioModal}
              titulo={`¿Elegís a ${postulante.profesional.nombre}?`}
              descripcion="Los demás postulantes van a ver que elegiste a otra persona. Podrás contactarlo directamente por WhatsApp."
              textoConfirmar="Elegir profesional"
              varianteConfirmar="profesional"
              pendiente={pendiente}
              onConfirmar={handleConfirmarEleccion}
              devolverFocoA={botonAbridorRef}
              error={errorElegir}
            />
          </>
        ) : (
          <span className="inline-flex min-h-[44px] items-center justify-center rounded-boton bg-divisor px-4 text-center text-sm font-bold text-texto-secundario opacity-60 sm:w-auto">
            {hayElegido ? "Descartado" : "No disponible"}
          </span>
        )}
      </div>
    </article>
  );
}
