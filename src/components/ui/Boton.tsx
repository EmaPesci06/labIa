import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/cn";

/**
 * Variantes del prototipo "Verano en la costa":
 * - principal: turquesa con texto sobre-accion. Una por pantalla, abajo.
 * - secundario: borde de 3 px color texto, fondo transparente.
 * - peligro: borde y texto en error (cancelar, borrar, suspender).
 * - enlace: texto en negrita con subrayado. Nunca accion sobre arena (4,48:1).
 *
 * Los nombres viejos siguen funcionando para no romper las pantallas que todavía no se rehacen:
 * cliente, profesional y exito son "principal"; fantasma es "enlace".
 */
export type VarianteBoton =
  | "principal"
  | "secundario"
  | "peligro"
  | "enlace"
  | "cliente"
  | "profesional"
  | "exito"
  | "fantasma";
export type TamanoBoton = "grande" | "normal";

type VarianteReal = "principal" | "secundario" | "peligro" | "enlace";

const VARIANTE_REAL: Record<VarianteBoton, VarianteReal> = {
  principal: "principal",
  secundario: "secundario",
  peligro: "peligro",
  enlace: "enlace",
  cliente: "principal",
  profesional: "principal",
  exito: "principal",
  fantasma: "enlace",
};

const VARIANTES: Record<VarianteReal, string> = {
  principal: "bg-accion text-sobre-accion hover:bg-accion/90 active:opacity-90",
  secundario:
    "border-[3px] border-texto bg-transparent text-texto hover:bg-superficie active:bg-superficie",
  peligro:
    "border-[3px] border-error bg-transparent text-error hover:bg-error/10 active:bg-error/15",
  enlace:
    "min-h-11 bg-transparent px-1 font-bold text-texto underline decoration-2 underline-offset-4",
};

// Alto y radio del prototipo: grande 56 (texto 18), normal 52 (texto 17). Radio 18 en todos.
const TAMANOS: Record<TamanoBoton, string> = {
  grande: "min-h-14 rounded-boton px-6 text-lg font-bold",
  normal: "min-h-[52px] rounded-boton px-5 text-[17px] font-bold",
};

type PropsComunes = {
  /** Aspecto del botón: principal, secundario, peligro o enlace. */
  variante?: VarianteBoton;
  /** "grande" (alto 56 px, texto 18) o "normal" (alto 52 px, texto 17). Los enlaces no usan tamaño. */
  tamano?: TamanoBoton;
  /** Muestra un spinner, pone `aria-busy` y bloquea los clics. */
  cargando?: boolean;
  /** Ocupa todo el ancho disponible. */
  bloque?: boolean;
  /** Para devolver el foco (p. ej. al cerrar una hoja). Solo llega al `<button>`. */
  ref?: Ref<HTMLButtonElement>;
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
 * <Boton tamano="grande" bloque>Buscar</Boton>
 * <Boton href="/registro" variante="secundario">Crear cuenta</Boton>
 */
export function Boton({
  variante = "principal",
  tamano = "normal",
  cargando = false,
  bloque = false,
  children,
  className,
  href,
  ref,
  ...resto
}: BotonProps) {
  const real = VARIANTE_REAL[variante];
  const clases = cn(
    "inline-flex items-center justify-center gap-2 text-center transition-colors select-none",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed",
    VARIANTES[real],
    real !== "enlace" && TAMANOS[tamano],
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
      ref={ref}
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
