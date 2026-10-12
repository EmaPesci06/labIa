"use client";

import { MessageCircle } from "lucide-react";

import { Boton } from "@/components/ui/Boton";

/**
 * Botón "Contactar por WhatsApp" del perfil. Con `hrefIngreso` (visitante sin sesión) es un enlace
 * a `/ingresar?volver=…`. Con sesión hoy no hace nada: el número del profesional nunca viaja en el
 * HTML, y la hoja "Antes de contactar" con los consejos de seguridad es de LAB-25.
 */
export function BotonContactar({
  className,
  hrefIngreso,
}: {
  className?: string;
  hrefIngreso?: string;
}) {
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
  return (
    <Boton
      variante="exito"
      tamano="grande"
      bloque
      className={className}
      onClick={() => {
        // TODO(LAB-25): abrir la hoja "Antes de contactar"; al confirmar, pedir el WhatsApp al
        // servidor, registrar el contacto (origen "perfil") y abrir wa.me.
      }}
    >
      {contenido}
    </Boton>
  );
}
