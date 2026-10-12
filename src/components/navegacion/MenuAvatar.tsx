"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { SelectorTema } from "@/components/SelectorTema";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { RolApp } from "@/lib/sesion";

type Props = {
  nombre: string;
  rol: RolApp;
};

const ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-campo px-3 text-[15px] font-semibold text-texto hover:bg-azul-suave";

/**
 * Avatar de la barra superior con un panel desplegable: Mi cuenta, Tema y Salir.
 * Es un botón de despliegue (`aria-expanded`), no un `role="menu"`: adentro hay un grupo de
 * radios, así que se recorre con Tab. Escape o un clic afuera lo cierran.
 */
export function MenuAvatar({ nombre, rol }: Props) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    };
    const alSalirElFoco = (evento: FocusEvent) => {
      const destino = evento.relatedTarget as Node | null;
      if (destino && !contenedor.current?.contains(destino)) setAbierto(false);
    };
    const nodo = contenedor.current;
    document.addEventListener("pointerdown", alPresionar);
    document.addEventListener("keydown", alTeclear);
    nodo?.addEventListener("focusout", alSalirElFoco);
    return () => {
      document.removeEventListener("pointerdown", alPresionar);
      document.removeEventListener("keydown", alTeclear);
      nodo?.removeEventListener("focusout", alSalirElFoco);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        aria-label={`Cuenta de ${nombre}`}
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((valor) => !valor)}
        className="flex size-11 items-center justify-center rounded-full"
      >
        <Avatar
          nombre={nombre}
          className={cn(rol === "profesional" && "bg-naranja-accion text-sobre-naranja")}
        />
      </button>
      {abierto ? (
        <div
          id={idPanel}
          className="absolute top-full right-0 z-50 mt-2 flex w-72 flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-3 shadow-lg"
        >
          <p className="truncate px-3 pt-1 text-sm font-bold text-texto-secundario">{nombre}</p>
          <Link href="/cuenta" className={ITEM} onClick={() => setAbierto(false)}>
            <UserRound aria-hidden strokeWidth={2} className="size-5" />
            Mi cuenta
          </Link>
          <div className="border-t border-divisor px-3 pt-3">
            <SelectorTema />
          </div>
          {/* Sesión falsa (LAB-13): LAB-16 lo cambia por la Server Action que cierra la sesión. */}
          <div className="border-t border-divisor pt-2">
            <Link href="/" className={ITEM} onClick={() => setAbierto(false)}>
              <LogOut aria-hidden strokeWidth={2} className="size-5" />
              Salir
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
