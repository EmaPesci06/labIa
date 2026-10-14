import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type VarianteBoton = "cliente" | "profesional" | "exito" | "secundario" | "fantasma";
export type TamanoBoton = "grande" | "normal";

const VARIANTES: Record<VarianteBoton, string> = {
  cliente: "bg-azul text-sobre-azul hover:bg-azul/90 active:bg-azul-presionado",
  profesional:
    "bg-naranja-accion text-sobre-naranja hover:bg-naranja-accion/90 active:brightness-90",
  exito: "bg-exito text-sobre-exito hover:bg-exito/90 active:brightness-90",
  secundario:
    "border-[1.5px] border-borde bg-superficie text-texto hover:bg-azul-suave active:bg-azul-suave",
  fantasma: "bg-transparent text-azul hover:bg-azul-suave active:bg-azul-suave",
};

const TAMANOS: Record<TamanoBoton, string> = {
  grande: "min-h-[52px] rounded-boton px-5 text-base font-bold",
  normal: "min-h-[46px] rounded-campo px-[18px] text-[15px] font-bold",
};

type PropsComunes = {
  /** Aspecto del botón. "cliente" azul, "profesional" naranja, "exito" verde (WhatsApp). */
  variante?: VarianteBoton;
  /** "grande" (alto 52 px, radio 14) o "normal" (alto 46 px, radio 12). */
  tamano?: TamanoBoton;
  /** Muestra un spinner, pone `aria-busy` y bloquea los clics. */
  cargando?: boolean;
  /** Ocupa todo el ancho disponible. */
  bloque?: boolean;
  children?: ReactNode;
  className?: string;
};

export type BotonProps = PropsComunes &
  (
    | ({ href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PropsComunes>)
    | ({ href: string } & Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        keyof PropsComunes | "href"
      >)
  );

/**
 * Botón de LabÍA. Con `href` se dibuja como enlace (`next/link`); sin `href`, como `<button>`.
 * Estados: hover, presionado, deshabilitado (`disabled`) y cargando (spinner + `aria-busy`).
 *
 * @example
 * <Boton variante="cliente" tamano="grande" bloque>Buscar</Boton>
 * <Boton href="/registro" variante="secundario">Crear cuenta</Boton>
 */
export function Boton({
  variante = "cliente",
  tamano = "normal",
  cargando = false,
  bloque = false,
  children,
  className,
  href,
  ...resto
}: BotonProps) {
  const clases = cn(
    "inline-flex items-center justify-center gap-2 text-center transition-colors select-none",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed",
    VARIANTES[variante],
    TAMANOS[tamano],
    bloque && "w-full",
    className,
  );

  const contenido = (
    <>
      {cargando ? <Loader2 aria-hidden strokeWidth={2} className="size-5 animate-spin" /> : null}
      {children}
    </>
  );

  if (href !== undefined) {
    const { tabIndex, ...enlace } = resto as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link
        {...enlace}
        href={href}
        // Sin manejador propio: así el botón-enlace también sirve en Server Components (una función
        // creada acá no se puede pasar a <Link>). Cargando se bloquea con CSS y sale del tab.
        className={cn(clases, cargando && "pointer-events-none")}
        aria-busy={cargando || undefined}
        aria-disabled={cargando || undefined}
        tabIndex={cargando ? -1 : tabIndex}
      >
        {contenido}
      </Link>
    );
  }

  const {
    onClick,
    type = "button",
    "aria-disabled": ariaDisabledProp,
    ...boton
  } = resto as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...boton}
      type={type}
      className={clases}
      // Cargando no usa `disabled` para no perder el foco del teclado: solo se bloquea el clic.
      aria-busy={cargando || undefined}
      aria-disabled={cargando || ariaDisabledProp || undefined}
      onClick={(evento) => {
        if (cargando) {
          evento.preventDefault();
          return;
        }
        onClick?.(evento);
      }}
    >
      {contenido}
    </button>
  );
}
