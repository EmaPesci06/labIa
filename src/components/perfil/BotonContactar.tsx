"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { Boton } from "@/components/ui/Boton";

import { HojaContacto } from "./HojaContacto";

/**
 * Botón "Contactar por WhatsApp" del perfil (LAB-25). Con `hrefIngreso` (visitante sin sesión) es un
 * enlace a `/ingresar?volver=…`. Con `profesionalId` (cliente con sesión) abre la hoja "Antes de
 * contactar"; el número se pide al servidor recién al confirmar.
 */
export function BotonContactar({
  className,
  hrefIngreso,
  profesionalId,
}: {
  className?: string;
  hrefIngreso?: string;
  profesionalId?: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const contenido = (
    <>
      <MessageCircle aria-hidden strokeWidth={2} className="size-5" />
      Contactar por WhatsApp
    </>
  );

  if (hrefIngreso) {
    return (
      <Boton href={hrefIngreso} variante="exito" tamano="grande" bloque className={className}>
        {contenido}
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
        onClick={() => setAbierta(true)}
      >
        {contenido}
      </Boton>
      <HojaContacto abierta={abierta} onCambioAbierta={setAbierta} profesionalId={profesionalId} />
    </>
  );
}
