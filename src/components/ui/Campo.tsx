"use client";

import { ChevronDown } from "lucide-react";
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/cn";

import { SIN_ANILLO } from "./foco";

type PropsBase = {
  /** Texto de la etiqueta (siempre visible, arriba del campo). */
  etiqueta: string;
  /** Ayuda debajo del campo. */
  ayuda?: string;
  /** Mensaje de error en castellano. Marca el campo con `aria-invalid` y lo asocia con `aria-describedby`. */
  error?: string;
  /** Clases para el contenedor. */
  className?: string;
};

type PropsTexto = PropsBase & {
  /** "texto" (por defecto), "telefono" (`inputMode="tel"`) o "pesos" (prefijo `$`, numérico). */
  variante?: "texto" | "telefono" | "pesos";
  /** Elemento al final del campo (por ejemplo el botón mostrar/ocultar de una contraseña). */
  adorno?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "children">;

type PropsArea = PropsBase & {
  variante: "area";
  /** Con `maxLength` se muestra el contador "12/500". */
  maxLength?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "children">;

type PropsSeleccion = PropsBase & {
  variante: "seleccion";
  /** Las `<option>`. */
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "children">;

export type CampoProps = PropsTexto | PropsArea | PropsSeleccion;

// Texto e área: capa fina sobre `Input` y `Textarea` de shadcn. Radio de shadcn, borde de 2 px color
// `borde` (3:1 sobre superficie y fondo, más visible que el `--input` de shadcn), 3 px con error.
// Fondo `campo` en los dos temas (shadcn pinta `input/30` en oscuro). Texto de 17 px: evita el zoom
// de iOS. Un solo foco: el outline de globals.css, sin el anillo de shadcn.
const CONTROL =
  "w-full border-2 border-borde bg-campo px-3.5 text-[17px] text-foreground md:text-[17px] dark:bg-campo " +
  "focus-visible:border-borde aria-invalid:border-[3px] aria-invalid:border-error " +
  "dark:aria-invalid:border-error " +
  SIN_ANILLO;

// Selección: sigue siendo el `<select>` nativo hasta LAB-84 (Select de shadcn), con su estilo propio.
const CONTROL_SELECCION =
  "w-full rounded-campo border-2 border-texto bg-campo px-3.5 text-[17px] text-texto " +
  "placeholder:text-texto placeholder:opacity-60 " +
  "aria-invalid:border-3 aria-invalid:border-error " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Campo de formulario con etiqueta, ayuda y error asociados: capa fina sobre `Input`, `Textarea` y
 * `Label` de shadcn. Alto 52 px, borde de 2 px color `borde`. Variantes: texto, teléfono, pesos (prefijo `$`), área (con contador) y selección.
 *
 * @example
 * <Campo etiqueta="Nombre" name="nombre" error={errores.nombre} />
 * <Campo variante="area" etiqueta="Descripción" maxLength={500} />
 */
export function Campo(props: CampoProps) {
  const idGenerado = useId();
  const { etiqueta, ayuda, error, className } = props;
  const id = props.id ?? idGenerado;
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const idContador = `${id}-contador`;

  const [largo, setLargo] = useState<number>(() => {
    const inicial = props.variante === "area" ? (props.value ?? props.defaultValue ?? "") : "";
    return String(inicial).length;
  });

  const maxLength = props.variante === "area" ? props.maxLength : undefined;
  const describedBy =
    [
      error ? idError : undefined,
      ayuda ? idAyuda : undefined,
      maxLength ? idContador : undefined,
      props["aria-describedby"],
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const comunes = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;

  let control: ReactNode;
  if (props.variante === "area") {
    const {
      variante: _variante,
      etiqueta: _e,
      ayuda: _a,
      error: _r,
      className: _c,
      onChange,
      ...area
    } = props;
    void [_variante, _e, _a, _r, _c];
    control = (
      <Textarea
        {...area}
        {...comunes}
        rows={area.rows ?? 4}
        className={cn(CONTROL, "min-h-[116px] resize-y py-3")}
        onChange={(evento) => {
          setLargo(evento.target.value.length);
          onChange?.(evento);
        }}
      />
    );
  } else if (props.variante === "seleccion") {
    const {
      variante: _variante,
      etiqueta: _e,
      ayuda: _a,
      error: _r,
      className: _c,
      children,
      ...seleccion
    } = props;
    void [_variante, _e, _a, _r, _c];
    control = (
      <div className="relative">
        <select
          {...seleccion}
          {...comunes}
          className={cn(CONTROL_SELECCION, "h-[52px] appearance-none pr-10")}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={2.5}
          className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-texto"
        />
      </div>
    );
  } else {
    const {
      variante = "texto",
      etiqueta: _e,
      ayuda: _a,
      error: _r,
      className: _c,
      type,
      inputMode,
      autoComplete,
      adorno,
      ...entrada
    } = props;
    void [_e, _a, _r, _c];
    const esPesos = variante === "pesos";
    const esTelefono = variante === "telefono";
    control = (
      <div className="relative">
        {esPesos ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-bold text-texto"
          >
            $
          </span>
        ) : null}
        <Input
          {...entrada}
          {...comunes}
          type={type ?? (esTelefono ? "tel" : "text")}
          inputMode={inputMode ?? (esTelefono ? "tel" : esPesos ? "numeric" : undefined)}
          autoComplete={autoComplete ?? (esTelefono ? "tel" : undefined)}
          className={cn(CONTROL, "h-[52px]", esPesos && "pl-8", adorno && "pr-12")}
        />
        {adorno ? (
          <div className="absolute top-1/2 right-0.5 -translate-y-1/2">{adorno}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-base leading-normal font-bold text-foreground">
        {etiqueta}
      </Label>
      {control}
      {error ? (
        <p id={idError} className="text-[15px] font-bold text-error">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-[15px] text-texto">
          {ayuda}
        </p>
      ) : null}
      {maxLength ? (
        <p id={idContador} className="self-end text-xs font-bold text-texto">
          {largo}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}
