"use client";

import { useActionState, useEffect, useRef } from "react";

import { Boton } from "@/components/ui/Boton";
import { HojaInferior } from "@/components/ui/HojaInferior";
import { contactarProfesional } from "@/lib/contacto/acciones";
import { ESTADO_CONTACTO_INICIAL, type EstadoContacto } from "@/lib/contacto/estado";
import { registrarEvento } from "@/lib/metricas";

/** Los cuatro consejos de seguridad, en el orden y con el texto del prototipo (LAB-25). */
const CONSEJOS = [
  "Pedí el presupuesto por escrito.",
  "Pasá tu dirección exacta recién cuando haya acuerdo.",
  "Al llegar, confirmá que es la persona del perfil.",
  "Acordá la seña y dejala escrita.",
] as const;

/**
 * Abre una pestaña vacía dentro del mismo toque del usuario: si se abre después de la respuesta del
 * servidor, el navegador la bloquea. En iOS instalado como app (standalone) no se abre pestaña: se
 * navega en la misma ventana.
 */
function abrirPestanaVacia(): Window | null {
  const enApp =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (enApp) return null;
  const pestana = window.open("", "_blank");
  if (pestana) pestana.opener = null;
  return pestana;
}

type Props = {
  abierta: boolean;
  onCambioAbierta: (abierta: boolean) => void;
  profesionalId: string;
  /** Elemento al que vuelve el foco al cerrar. */
  devolverFocoA?: { current: HTMLElement | null };
};

/**
 * Hoja "Antes de contactar" (prototipo "Perfil" y "Desk-Perfil"). Muestra los consejos y, al tocar
 * "Abrir WhatsApp", la Server Action registra el contacto y devuelve el link de `wa.me`.
 */
export function HojaContacto({ abierta, onCambioAbierta, profesionalId, devolverFocoA }: Props) {
  const [estado, accion, pendiente] = useActionState(contactarProfesional, ESTADO_CONTACTO_INICIAL);
  const pestanaRef = useRef<Window | null>(null);
  const procesado = useRef<EstadoContacto | null>(null);

  useEffect(() => {
    // Cada respuesta se procesa una sola vez: si el padre se vuelve a renderizar no se reabre nada.
    if (procesado.current === estado) return;
    procesado.current = estado;
    const pestana = pestanaRef.current;
    pestanaRef.current = null;

    if (estado.url) {
      registrarEvento("whatsapp_abierto", { origen: "perfil" });
      if (pestana && !pestana.closed) pestana.location.href = estado.url;
      else window.location.href = estado.url;
      onCambioAbierta(false);
    } else if (pestana && !pestana.closed) {
      pestana.close();
    }
  }, [estado, onCambioAbierta]);

  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={onCambioAbierta}
      titulo="Antes de contactar"
      devolverFocoA={devolverFocoA}
      ocultarCierreEnEscritorio
    >
      <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug">
        {CONSEJOS.map((consejo) => (
          <li key={consejo}>{consejo}</li>
        ))}
      </ul>

      <form
        action={accion}
        onSubmit={() => {
          pestanaRef.current = abrirPestanaVacia();
        }}
        className="flex flex-col gap-3.5"
      >
        <input type="hidden" name="profesionalId" value={profesionalId} />
        <input type="hidden" name="origen" value="perfil" />

        {estado.mensaje ? (
          <p id="error-contacto" role="alert" className="text-sm font-semibold text-error">
            {estado.mensaje}
          </p>
        ) : null}

        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:gap-2.5">
          <Boton
            type="submit"
            variante="exito"
            tamano="grande"
            bloque
            cargando={pendiente}
            disabled={pendiente}
            aria-describedby={estado.mensaje ? "error-contacto" : undefined}
          >
            Abrir WhatsApp
          </Boton>

          <Boton
            type="button"
            variante="fantasma"
            bloque
            onClick={() => onCambioAbierta(false)}
            className="lg:border-[1.5px] lg:border-borde lg:bg-superficie lg:text-texto lg:hover:bg-azul-suave"
          >
            Cancelar
          </Boton>
        </div>
      </form>
    </HojaInferior>
  );
}
