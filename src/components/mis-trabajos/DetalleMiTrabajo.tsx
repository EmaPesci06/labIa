"use client";

import { MessageCircle, CheckCircle, ArrowLeftRight, XCircle, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { HojaContacto } from "@/components/perfil/HojaContacto";
import { GaleriaFotosTrabajo } from "@/components/trabajos/GaleriaFotosTrabajo";
import { Chip } from "@/components/ui/Chip";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import {
  cambiarProfesional,
  cancelarTrabajo,
  elegirPostulante,
  marcarTrabajoTerminado,
} from "@/lib/trabajos/acciones";
import type { DetalleMiTrabajoCliente } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

import { ModalConfirmacion } from "./ModalConfirmacion";
import { TarjetaPostulante } from "./TarjetaPostulante";

type Props = {
  trabajo: DetalleMiTrabajoCliente;
  mostrarTituloCompleto?: boolean;
  publicado?: boolean;
};

export function DetalleMiTrabajo({
  trabajo,
  mostrarTituloCompleto = false,
  publicado = false,
}: Props) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Modales
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [modalTerminarAbierto, setModalTerminarAbierto] = useState(false);
  const [modalCambiarAbierto, setModalCambiarAbierto] = useState(false);
  const [hojaContactoAbierta, setHojaContactoAbierta] = useState(false);

  const botonCancelarRef = useRef<HTMLButtonElement | null>(null);
  const botonTerminarRef = useRef<HTMLButtonElement | null>(null);
  const botonCambiarRef = useRef<HTMLButtonElement | null>(null);
  const botonWhatsAppRef = useRef<HTMLButtonElement | null>(null);

  // Orden de postulantes
  const [orden, setOrden] = useState<"recientes" | "calificacion">("recientes");

  const cuando = haceCuanto(trabajo.createdAt);
  const postulantesOrdenados = [...trabajo.postulantes].sort((a, b) => {
    if (orden === "calificacion") {
      if (b.profesional.promedio !== a.profesional.promedio) {
        return b.profesional.promedio - a.profesional.promedio;
      }
      return b.profesional.cantidadResenas - a.profesional.cantidadResenas;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const postulanteElegido = trabajo.profesionalElegidoId
    ? trabajo.postulantes.find((p) => p.profesionalId === trabajo.profesionalElegidoId)
    : null;
  const nombreElegido = postulanteElegido
    ? `${postulanteElegido.profesional.nombre} ${postulanteElegido.profesional.apellidoInicial}.`.trim()
    : "el profesional";

  // Acciones
  function handleElegir(postulacionId: string) {
    setMensajeError(null);
    startTransition(async () => {
      const res = await elegirPostulante(postulacionId, trabajo.id);
      if (!res.ok) {
        setMensajeError(res.mensaje ?? "No pudimos elegir al profesional.");
      } else {
        router.refresh();
      }
    });
  }

  function handleCancelar() {
    setMensajeError(null);
    startTransition(async () => {
      const res = await cancelarTrabajo(trabajo.id);
      if (!res.ok) {
        setMensajeError(res.mensaje ?? "No pudimos cancelar el trabajo.");
      } else {
        setModalCancelarAbierto(false);
        router.refresh();
      }
    });
  }

  function handleTerminar() {
    setMensajeError(null);
    startTransition(async () => {
      const res = await marcarTrabajoTerminado(trabajo.id);
      if (!res.ok) {
        setMensajeError(res.mensaje ?? "No pudimos marcar el trabajo como terminado.");
      } else {
        setModalTerminarAbierto(false);
        router.refresh();
      }
    });
  }

  function handleCambiar() {
    setMensajeError(null);
    startTransition(async () => {
      const res = await cambiarProfesional(trabajo.id);
      if (!res.ok) {
        setMensajeError(res.mensaje ?? "No pudimos cambiar de profesional.");
      } else {
        setModalCambiarAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {publicado ? (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-[14px] bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave"
        >
          <CheckCircle aria-hidden className="size-5 shrink-0" />
          <span>¡Publicado! Te avisamos por email cuando alguien se postule.</span>
        </div>
      ) : null}

      {mensajeError ? (
        <div
          role="alert"
          className="rounded-[14px] border border-error/20 bg-error/10 p-4 text-sm font-semibold text-error"
        >
          {mensajeError}
        </div>
      ) : null}

      {/* Encabezado del trabajo */}
      <section
        aria-label="Detalles de mi trabajo"
        className="flex flex-col gap-3.5 rounded-[18px] border border-divisor bg-superficie p-4 text-texto lg:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <EtiquetaMono partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre]} />
          <span
            className={
              trabajo.estado === "asignado"
                ? "rounded-full bg-exito-suave px-2.5 py-1 text-xs font-bold text-sobre-exito-suave"
                : trabajo.estado === "abierto"
                  ? "rounded-full bg-azul-suave px-2.5 py-1 text-xs font-bold text-sobre-azul-suave"
                  : "rounded-full bg-divisor px-2.5 py-1 text-xs font-bold text-texto-secundario"
            }
          >
            {trabajo.estado === "abierto"
              ? "Abierto"
              : trabajo.estado === "asignado"
                ? "Contratado"
                : trabajo.estado === "cerrado"
                  ? "Terminado"
                  : "Cancelado"}
          </span>
        </div>

        <h1 className="font-titulo text-xl font-extrabold tracking-tight text-texto lg:text-2xl">
          {trabajo.titulo}
        </h1>

        <p className="text-sm text-texto-secundario">
          Publicado {cuando} · {ETIQUETA_URGENCIA[trabajo.urgencia]} ·{" "}
          {trabajo.postulantes.length === 0
            ? "Sin postulantes"
            : trabajo.postulantes.length === 1
              ? "1 postulante"
              : `${trabajo.postulantes.length} postulantes`}
        </p>

        {trabajo.descripcion ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-line text-texto lg:text-base">
            {trabajo.descripcion}
          </p>
        ) : null}

        {trabajo.fotos.length > 0 ? (
          <div className="pt-2">
            <GaleriaFotosTrabajo fotos={trabajo.fotos} tituloTrabajo={trabajo.titulo} />
          </div>
        ) : null}

        {trabajo.presupuestoEstimado !== null ? (
          <p className="text-sm font-semibold text-texto-secundario">
            Presupuesto estimado: {formatearPesos(trabajo.presupuestoEstimado)}
          </p>
        ) : null}

        {/* Acciones principales según estado */}
        {trabajo.estado === "abierto" ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-divisor pt-3">
            <button
              ref={botonCancelarRef}
              type="button"
              disabled={pendiente}
              onClick={() => setModalCancelarAbierto(true)}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-boton border border-divisor px-4 text-sm font-semibold text-error hover:bg-error/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <XCircle aria-hidden className="size-4" />
              Cancelar trabajo
            </button>
            <ModalConfirmacion
              abierta={modalCancelarAbierto}
              onCambioAbierta={setModalCancelarAbierto}
              titulo="¿Cancelar este trabajo?"
              descripcion="Ya no recibirás más postulaciones y los profesionales verán que el trabajo fue cancelado."
              textoConfirmar="Sí, cancelar trabajo"
              varianteConfirmar="peligro"
              pendiente={pendiente}
              onConfirmar={handleCancelar}
              devolverFocoA={botonCancelarRef}
            />
          </div>
        ) : null}
      </section>

      {/* Banner y acciones de trabajo contratado */}
      {trabajo.estado === "asignado" ? (
        <section
          aria-label="Profesional contratado"
          className="flex flex-col gap-4 rounded-[18px] border border-exito/30 bg-exito-suave p-4 text-texto lg:p-5"
        >
          <div className="flex items-start gap-3">
            <CheckCircle aria-hidden className="size-6 shrink-0 text-exito" />
            <p className="text-[15px] leading-relaxed text-sobre-exito-suave lg:text-base">
              Elegiste a <strong>{nombreElegido}</strong>. Escribile por WhatsApp para coordinar.
              Cuando termine, dejale una reseña.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {trabajo.profesionalElegidoId ? (
              <>
                <button
                  ref={botonWhatsAppRef}
                  type="button"
                  onClick={() => setHojaContactoAbierta(true)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-boton bg-exito px-5 text-sm font-bold text-sobre-exito transition-opacity hover:opacity-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco active:opacity-90"
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Escribir por WhatsApp
                </button>
                <HojaContacto
                  abierta={hojaContactoAbierta}
                  onCambioAbierta={setHojaContactoAbierta}
                  profesionalId={trabajo.profesionalElegidoId}
                  origen="postulacion"
                  trabajoId={trabajo.id}
                  devolverFocoA={botonWhatsAppRef}
                />
              </>
            ) : null}

            <button
              ref={botonTerminarRef}
              type="button"
              disabled={pendiente}
              onClick={() => setModalTerminarAbierto(true)}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-boton bg-azul px-4 text-sm font-bold text-sobre-azul transition-colors hover:bg-azul-presionado focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco dark:bg-azul-suave dark:text-sobre-azul-suave"
            >
              <CheckCircle aria-hidden className="size-4" />
              Marcar como terminado
            </button>
            <ModalConfirmacion
              abierta={modalTerminarAbierto}
              onCambioAbierta={setModalTerminarAbierto}
              titulo="¿El trabajo ya está terminado?"
              descripcion="Se marcará como completado y podrás calificar al profesional con una reseña."
              textoConfirmar="Sí, marcar como terminado"
              varianteConfirmar="exito"
              pendiente={pendiente}
              onConfirmar={handleTerminar}
              devolverFocoA={botonTerminarRef}
            />

            <button
              ref={botonCambiarRef}
              type="button"
              disabled={pendiente}
              onClick={() => setModalCambiarAbierto(true)}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-boton border border-borde bg-superficie px-3.5 text-sm font-semibold text-texto hover:border-azul focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <ArrowLeftRight aria-hidden className="size-4" />
              Cambiar de profesional
            </button>
            <ModalConfirmacion
              abierta={modalCambiarAbierto}
              onCambioAbierta={setModalCambiarAbierto}
              titulo="¿Querés cambiar de profesional?"
              descripcion="El trabajo volverá a estar abierto y los demás postulantes podrán volver a ser elegidos."
              textoConfirmar="Sí, cambiar de profesional"
              varianteConfirmar="cliente"
              pendiente={pendiente}
              onConfirmar={handleCambiar}
              devolverFocoA={botonCambiarRef}
            />
          </div>
        </section>
      ) : null}

      {/* Banner si el trabajo está terminado */}
      {trabajo.estado === "cerrado" ? (
        <section
          aria-label="Trabajo terminado"
          className="flex flex-col gap-3 rounded-[18px] border border-divisor bg-superficie p-4 text-texto lg:p-5"
        >
          <div className="flex items-center gap-2.5 text-exito">
            <CheckCircle aria-hidden className="size-5" />
            <span className="font-bold">Este trabajo fue completado.</span>
          </div>
          {trabajo.profesionalElegidoId ? (
            <div className="pt-1">
              <Link
                href={`/profesionales/${trabajo.profesionalElegidoId}#resena`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-boton bg-naranja-accion px-5 text-sm font-bold text-sobre-naranja hover:opacity-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                <Star aria-hidden className="size-4" />
                Dejar reseña al profesional
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Sección de Postulantes */}
      <section aria-label="Postulantes" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-titulo text-lg font-bold tracking-tight text-texto lg:text-[22px]">
            {mostrarTituloCompleto
              ? `Postulantes para “${trabajo.titulo}”`
              : `Postulantes (${trabajo.postulantes.length})`}
          </h2>

          {trabajo.postulantes.length > 1 ? (
            <div
              className="flex items-center gap-1.5"
              role="group"
              aria-label="Ordenar postulantes"
            >
              <Chip seleccionado={orden === "recientes"} onClick={() => setOrden("recientes")}>
                Más recientes
              </Chip>
              <Chip
                seleccionado={orden === "calificacion"}
                onClick={() => setOrden("calificacion")}
              >
                Mejor calificados
              </Chip>
            </div>
          ) : null}
        </div>

        {postulantesOrdenados.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[18px] border border-dashed border-divisor bg-superficie p-6 text-center text-texto-secundario">
            <p className="text-[15px] font-medium">Todavía nadie se postuló.</p>
            <p className="text-sm">Te avisamos por email cuando pase.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {postulantesOrdenados.map((postulante) => {
              const esElegido = postulante.profesionalId === trabajo.profesionalElegidoId;
              return (
                <TarjetaPostulante
                  key={postulante.id}
                  postulante={postulante}
                  trabajoId={trabajo.id}
                  trabajoEstado={trabajo.estado}
                  esElegido={esElegido}
                  hayElegido={Boolean(trabajo.profesionalElegidoId)}
                  onElegir={handleElegir}
                  pendiente={pendiente}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
