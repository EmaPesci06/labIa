"use client";

import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Boton } from "@/components/ui/Boton";
import { Distancia } from "@/components/ui/Distancia";
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
      className="flex flex-col gap-3 rounded-[22px] bg-superficie p-4 text-texto lg:flex-row lg:items-center lg:gap-6 lg:p-5"
    >
      {/* En escritorio, datos del postulante a la izquierda y acciones a la derecha (prototipo Desk). */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
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
            <span className="text-[13px] text-texto lg:text-sm">{subtitulo}</span>
            {postulante.profesional.distanciaKm !== null ? (
              <div className="mt-1">
                <Distancia km={postulante.profesional.distanciaKm} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[12px] bg-fondo p-3 text-[15px] leading-relaxed text-texto italic">
          “{postulante.mensaje}”
        </div>

        {textoPresupuesto ? (
          <div className="text-sm font-semibold text-texto">{textoPresupuesto}</div>
        ) : null}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 pt-1 sm:flex sm:justify-end lg:mt-0 lg:shrink-0 lg:pt-0">
        <Boton
          href={`/profesionales/${postulante.profesionalId}`}
          variante="secundario"
          className="px-4 sm:w-auto"
        >
          Ver perfil
        </Boton>

        {esElegido ? (
          <span className="inline-flex min-h-[52px] items-center justify-center rounded-boton bg-sol px-4 text-center text-base font-bold text-sobre-sol sm:w-auto">
            Elegido
          </span>
        ) : trabajoEstado === "abierto" ? (
          <>
            <Boton
              ref={botonAbridorRef}
              variante="principal"
              disabled={pendiente}
              onClick={() => setModalAbierto(true)}
              className="px-4 sm:w-auto"
            >
              Elegir
            </Boton>
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
          <span className="inline-flex min-h-[44px] items-center justify-center rounded-boton bg-fondo px-4 text-center text-sm font-bold text-texto opacity-60 sm:w-auto">
            {hayElegido ? "Descartado" : "No disponible"}
          </span>
        )}
      </div>
    </article>
  );
}
