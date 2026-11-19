"use client";

import { useRef, useState } from "react";

import { Boton } from "@/components/ui/Boton";

import { HojaContacto } from "./HojaContacto";

/**
 * Botón "Escribirle por WhatsApp" del perfil (LAB-25). Con `hrefIngreso` (visitante sin sesión) es un
 * enlace a `/ingresar?volver=…`. Con `profesionalId` (cliente con sesión) abre la hoja de contacto;
 * el número se pide al servidor recién al confirmar.
 */
export function BotonContactar({
  className,
  hrefIngreso,
  profesionalId,
  etiqueta = "Contactar por WhatsApp",
  tituloHoja,
  textoCancelar,
}: {
  className?: string;
  hrefIngreso?: string;
  profesionalId?: string;
  etiqueta?: string;
  /** Título de la hoja; por defecto "Antes de contactar". */
  tituloHoja?: string;
  /** Texto del botón que cierra la hoja; por defecto "Cancelar". */
  textoCancelar?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  // El botón que abrió la hoja: al cerrar, el foco vuelve acá (criterio de accesibilidad de LAB-25).
  const botonAbridor = useRef<HTMLElement | null>(null);

  if (hrefIngreso) {
    return (
      <Boton href={hrefIngreso} variante="exito" tamano="grande" bloque className={className}>
        {etiqueta}
      </Boton>
    );
  }
  if (!profesionalId) return null;

  return (
    <>
      <Boton
        variante="exito"
        tamano="grande"
        bloque
        className={className}
        aria-haspopup="dialog"
        onClick={(evento) => {
          botonAbridor.current = evento.currentTarget;
          setAbierta(true);
        }}
      >
        {etiqueta}
      </Boton>
      <HojaContacto
        abierta={abierta}
        onCambioAbierta={setAbierta}
        profesionalId={profesionalId}
        devolverFocoA={botonAbridor}
        titulo={tituloHoja}
        textoCancelar={textoCancelar}
      />
    </>
  );
}
