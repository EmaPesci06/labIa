"use client";

import { MessageCircle, CheckCircle, ArrowLeftRight, XCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { HojaContacto } from "@/components/perfil/HojaContacto";
import { HojaResena } from "@/components/resenas/HojaResena";
import { GaleriaFotosTrabajo } from "@/components/trabajos/GaleriaFotosTrabajo";
import { Boton } from "@/components/ui/Boton";
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
  const [elegirEnCurso, setElegirEnCurso] = useState(false);
  const [errorElegir, setErrorElegir] = useState<string | null>(null);
  const ocupado = pendiente || elegirEnCurso;

  // Modales
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [modalTerminarAbierto, setModalTerminarAbierto] = useState(false);
  const [modalCambiarAbierto, setModalCambiarAbierto] = useState(false);
  const [hojaContactoAbierta, setHojaContactoAbierta] = useState(false);
  const [hojaResenaAbierta, setHojaResenaAbierta] = useState(false);

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
  /**
   * Elige un postulante. Devuelve `true` si salió bien (la tarjeta cierra su hoja) o `false` si
   * falló (la hoja queda abierta y muestra el error). El error vive aparte del banner general porque
   * la hoja de confirmación tapa el resto de la página.
   */
  async function handleElegir(postulacionId: string): Promise<boolean> {
    setErrorElegir(null);
    setElegirEnCurso(true);
    try {
      const res = await elegirPostulante(postulacionId, trabajo.id);
      if (!res.ok) {
        setErrorElegir(res.mensaje ?? "No pudimos elegir al profesional.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErrorElegir("No pudimos elegir al profesional. Probá de nuevo.");
      return false;
    } finally {
      setElegirEnCurso(false);
    }
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
        setHojaResenaAbierta(true);
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
          className="flex items-center gap-2.5 rounded-[14px] bg-sol p-4 text-[15px] font-semibold text-sobre-sol"
        >
          <CheckCircle aria-hidden className="size-5 shrink-0" />
          <span>¡Publicado! Te avisamos por email cuando alguien se postule.</span>
        </div>
      ) : null}

      {mensajeError ? (
        <div
          role="alert"
          className="rounded-[14px] border border-error bg-superficie p-4 text-sm font-semibold text-error"
        >
          {mensajeError}
        </div>
      ) : null}

      {/* Encabezado del trabajo */}
      <section
        aria-label="Detalles de mi trabajo"
        className="flex flex-col gap-3.5 rounded-[22px] bg-superficie p-5 text-texto lg:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <EtiquetaMono partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre]} />
          <span
            className={
              trabajo.estado === "asignado"
                ? "rounded-full bg-sol px-2.5 py-1 text-xs font-bold text-sobre-sol"
                : trabajo.estado === "abierto"
                  ? "rounded-full bg-superficie px-2.5 py-1 text-xs font-bold text-texto"
                  : "rounded-full bg-fondo px-2.5 py-1 text-xs font-bold text-texto"
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

        <h1 className="font-titulo text-[30px] leading-[1.05] font-extrabold text-texto lg:text-[34px]">
          {trabajo.titulo}
        </h1>

        <p className="text-sm text-texto">
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
          <p className="text-sm font-semibold text-texto">
            Presupuesto estimado: {formatearPesos(trabajo.presupuestoEstimado)}
          </p>
        ) : null}

        {/* Acciones principales según estado */}
        {trabajo.estado === "abierto" ? (
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-fondo pt-3">
            <Boton
              ref={botonCancelarRef}
              variante="peligro"
              disabled={pendiente}
              onClick={() => setModalCancelarAbierto(true)}
            >
              <XCircle aria-hidden className="size-4" />
              Cancelar trabajo
            </Boton>
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
          className="flex flex-col gap-4 rounded-[22px] bg-sol p-5 text-sobre-sol lg:p-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle aria-hidden className="size-6 shrink-0 text-texto" />
            <p className="text-[15px] leading-relaxed text-sobre-sol lg:text-base">
              Elegiste a <strong>{nombreElegido}</strong>. Escribile por WhatsApp para coordinar.
              Cuando termine, dejale una reseña.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {trabajo.profesionalElegidoId ? (
              <>
                <Boton
                  ref={botonWhatsAppRef}
                  type="button"
                  onClick={() => setHojaContactoAbierta(true)}
                >
                  <MessageCircle aria-hidden className="size-5" />
                  Escribir por WhatsApp
                </Boton>
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

            <Boton
              ref={botonTerminarRef}
              type="button"
              disabled={pendiente}
              onClick={() => setModalTerminarAbierto(true)}
            >
              <CheckCircle aria-hidden className="size-5" />
              Marcar como terminado
            </Boton>
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

            <Boton
              ref={botonCambiarRef}
              type="button"
              variante="secundario"
              disabled={pendiente}
              onClick={() => setModalCambiarAbierto(true)}
            >
              <ArrowLeftRight aria-hidden className="size-5" />
              Cambiar de profesional
            </Boton>
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
          className="flex flex-col gap-3 rounded-[22px] bg-superficie p-5 text-texto lg:p-6"
        >
          <div className="flex items-center gap-2.5 text-texto">
            <CheckCircle aria-hidden className="size-5" />
            <span className="font-bold">Este trabajo fue completado.</span>
          </div>
          {trabajo.profesionalElegidoId ? (
            <div className="pt-1">
              <Boton
                href={`/profesionales/${trabajo.profesionalElegidoId}#resena`}
                onClick={(e) => {
                  e.preventDefault();
                  setHojaResenaAbierta(true);
                }}
              >
                <Star aria-hidden className="size-5" />
                Dejar reseña al profesional
              </Boton>
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
          <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[22px] bg-superficie p-6 text-center text-texto">
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
                  pendiente={ocupado}
                  errorElegir={errorElegir}
                  onLimpiarErrorElegir={() => setErrorElegir(null)}
                />
              );
            })}
          </div>
        )}
      </section>

      {trabajo.profesionalElegidoId ? (
        <HojaResena
          abierta={hojaResenaAbierta}
          onCambioAbierta={setHojaResenaAbierta}
          profesionalId={trabajo.profesionalElegidoId}
          nombreProfesional={nombreElegido}
          trabajoId={trabajo.id}
          devolverFocoA={botonTerminarRef}
          alGuardar={() => {
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
