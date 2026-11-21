"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Avatar } from "@/components/ui/Avatar";
import { SIN_ANILLO } from "@/components/ui/foco";
import { salir } from "@/lib/auth/acciones";
import { cn } from "@/lib/cn";
import {
  esPreferenciaTema,
  guardarPreferencia,
  leerPreferencia,
  PREFERENCIAS_TEMA,
  suscribirseAlTema,
  type PreferenciaTema,
} from "@/lib/tema";

type Props = {
  nombre: string;
};

const ETIQUETAS_TEMA: Record<PreferenciaTema, string> = {
  claro: "Claro",
  oscuro: "Oscuro",
  sistema: "Sistema",
};

const leerDelNavegador = () => leerPreferencia(document.cookie);
const leerEnServidor = () => null;

const ITEM =
  "min-h-11 cursor-pointer gap-3 rounded-xl px-3 text-[15px] font-bold text-texto focus:bg-sol focus:text-sobre-sol";

/**
 * Avatar de la barra superior sobre `DropdownMenu` de shadcn: Mi cuenta, Tema y Salir.
 * Se maneja con flechas, Enter y Esc; devuelve el foco al botón al cerrar.
 */
export function MenuAvatar({ nombre }: Props) {
  const formSalir = useRef<HTMLFormElement>(null);
  const preferencia = useSyncExternalStore(suscribirseAlTema, leerDelNavegador, leerEnServidor);
  const [anuncio, setAnuncio] = useState("");

  function cambiarTema(valor: string) {
    if (!esPreferenciaTema(valor)) return;
    guardarPreferencia(valor);
    setAnuncio(`Tema: ${ETIQUETAS_TEMA[valor]}`);
  }

  return (
    <>
      <form ref={formSalir} action={salir} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-11 cursor-pointer items-center justify-center rounded-full",
            SIN_ANILLO,
          )}
        >
          <span className="sr-only">Cuenta de {nombre}</span>
          <span aria-hidden className="inline-flex">
            <Avatar nombre={nombre} />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-72 rounded-3xl border-2 border-texto bg-superficie p-2 text-texto shadow-md data-open:zoom-in-100"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate px-3 py-1.5 text-sm font-bold text-texto">
              {nombre}
            </DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/cuenta" />} className={ITEM}>
              <UserRound aria-hidden strokeWidth={2} className="size-5" />
              Mi cuenta
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-fondo" />

          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-1 text-xs font-bold text-texto-suave">
              Tema
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={preferencia ?? undefined} onValueChange={cambiarTema}>
              {PREFERENCIAS_TEMA.map((opcion) => (
                <DropdownMenuRadioItem
                  key={opcion}
                  value={opcion}
                  closeOnClick={false}
                  className="min-h-11 cursor-pointer rounded-xl px-3 pr-9 text-[15px] font-normal text-texto focus:bg-sol focus:text-sobre-sol"
                >
                  {ETIQUETAS_TEMA[opcion]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1.5 bg-fondo" />

          <DropdownMenuItem
            onClick={() => formSalir.current?.requestSubmit()}
            className="min-h-11 cursor-pointer gap-3 rounded-xl px-3 text-[15px] font-bold text-texto focus:bg-sol focus:text-sobre-sol"
          >
            <LogOut aria-hidden strokeWidth={2} className="size-5" />
            Salir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </span>
    </>
  );
}
