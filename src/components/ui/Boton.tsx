import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { Button, buttonVariants } from "@/components/shadcn/button";
import { cn } from "@/lib/cn";

import { SIN_ANILLO_BOTON } from "./foco";

/**
 * Capa fina sobre el `Button` de shadcn (LAB-86). Variantes de LabÍA → variantes de shadcn:
 * - principal → default: turquesa con texto sobre-accion. Una por pantalla, abajo.
 * - secundario → secondary: sol con texto azul noche.
 * - peligro → destructive: error sobre un tinte suave (cancelar, borrar, suspender).
 * - enlace → link: texto en negrita con subrayado. Nunca accion sobre arena (4,48:1).
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

const VARIANTE_SHADCN = {
  principal: "default",
  secundario: "secondary",
  peligro: "destructive",
  enlace: "link",
} as const;

// El texto del enlace va en `foreground` (azul mar): `primary` sobre arena no llega a 4,5:1.
const VARIANTES: Record<VarianteReal, string> = {
  principal: "active:opacity-90",
  secundario: "",
  // El tinte `destructive/20` de shadcn en oscuro deja el texto en 3,6:1: se usa superficie y borde.
  peligro:
    "border-destructive bg-card hover:bg-destructive/10 dark:bg-card dark:hover:bg-destructive/10",
  enlace: "h-auto min-h-11 px-1 font-bold text-foreground underline decoration-2 hover:underline",
};

// Alto del prototipo: grande 56 (texto 18), normal 52 (texto 17), como mínimo (las pantallas lo ajustan con min-h-*). El radio es el de shadcn.
const TAMANOS: Record<TamanoBoton, string> = {
  grande: "h-auto min-h-14 px-6 text-lg font-bold",
  normal: "h-auto min-h-[52px] px-5 text-[17px] font-bold",
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
 * Botón de LabÍA. Con `href` se dibuja como enlace (`next/link`) con las clases de `Button`; sin
 * `href`, como `Button` de shadcn. Estados: hover, presionado, deshabilitado (`disabled`) y cargando
 * (spinner + `aria-busy`).
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
    // transition-colors: el transition-all de shadcn anima también la opacidad y axe mide a mitad de camino.
    "gap-2 text-center transition-colors",
    "aria-disabled:cursor-not-allowed",
    VARIANTES[real],
    real !== "enlace" && TAMANOS[tamano],
    SIN_ANILLO_BOTON,
    bloque && "w-full",
    className,
  );
  const shadcn = VARIANTE_SHADCN[real];

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
        data-slot="button"
        // Sin manejador propio: así el botón-enlace también sirve en Server Components (una función
        // creada acá no se puede pasar a <Link>). Cargando se bloquea con CSS y sale del tab.
        className={cn(
          buttonVariants({ variant: shadcn }),
          clases,
          cargando && "pointer-events-none",
        )}
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
    <Button
      {...boton}
      ref={ref}
      type={type}
      variant={shadcn}
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
    </Button>
  );
}
