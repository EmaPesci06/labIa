"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { Boton } from "@/components/ui/Boton";
import { Hoja } from "@/components/ui/Hoja";
import { contactarProfesional } from "@/lib/contacto/acciones";
import { ESTADO_CONTACTO_INICIAL, type EstadoContacto } from "@/lib/contacto/estado";
import { registrarEvento } from "@/lib/metricas";

/** Los cuatro consejos de seguridad (LAB-25): no se recortan aunque el boceto muestre dos. */
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
  origen?: "perfil" | "postulacion";
  trabajoId?: string;
  /** Elemento al que vuelve el foco al cerrar. */
  devolverFocoA?: { current: HTMLElement | null };
  /** Título de la hoja. Por defecto "Antes de contactar". */
  titulo?: string;
  /** Texto del botón que cierra sin contactar. Por defecto "Cancelar". */
  textoCancelar?: string;
};

/**
 * Hoja de contacto por WhatsApp (prototipo "App-Contacto"). Muestra los consejos y, al tocar
 * "Abrir WhatsApp", la Server Action registra el contacto y devuelve el link de `wa.me`.
 * El mensaje lo arma el servidor: el número nunca viaja en el HTML.
 */
export function HojaContacto({
  abierta,
  onCambioAbierta,
  profesionalId,
  origen = "perfil",
  trabajoId,
  devolverFocoA,
  titulo = "Antes de contactar",
  textoCancelar = "Cancelar",
}: Props) {
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
      registrarEvento("whatsapp_abierto", { origen });
      if (pestana && !pestana.closed) pestana.location.href = estado.url;
      else window.location.href = estado.url;
      onCambioAbierta(false);
    } else if (pestana && !pestana.closed) {
      pestana.close();
    }
  }, [estado, onCambioAbierta, origen]);

  return (
    <Hoja
      abierta={abierta}
      onCambioAbierta={onCambioAbierta}
      titulo={titulo}
      devolverFocoA={devolverFocoA}
      ocultarCierreEnEscritorio
    >
      <ul className="flex flex-col gap-2 rounded-[18px] bg-superficie p-3.5 text-[15px] leading-snug">
        {CONSEJOS.map((consejo) => (
          <li key={consejo} className="flex gap-2.5">
            <Check
              aria-hidden
              strokeWidth={3.5}
              className="mt-0.5 size-[18px] shrink-0 text-accion"
            />
            <span>{consejo}</span>
          </li>
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
        <input type="hidden" name="origen" value={origen} />
        {trabajoId ? <input type="hidden" name="trabajoId" value={trabajoId} /> : null}

        {estado.mensaje ? (
          <p id="error-contacto" role="alert" className="text-sm font-semibold text-error">
            {estado.mensaje}
          </p>
        ) : null}

        <Boton
          type="submit"
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
          variante="enlace"
          className="self-center"
          onClick={() => onCambioAbierta(false)}
        >
          {textoCancelar}
        </Boton>
      </form>
    </Hoja>
  );
}
