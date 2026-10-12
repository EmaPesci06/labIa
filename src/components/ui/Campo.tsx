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

import { cn } from "@/lib/cn";

type PropsBase = {
  /** Texto de la etiqueta (siempre visible, arriba del campo). */
  etiqueta: string;
  /** Ayuda en texto terciario debajo del campo. */
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

const CONTROL =
  "w-full rounded-boton border border-borde bg-superficie px-3.5 text-base text-texto " +
  "placeholder:text-texto-terciario aria-invalid:border-error aria-invalid:border-2 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Campo de formulario con etiqueta, ayuda y error asociados. Texto 16 px (evita el zoom de iOS),
 * alto 52 px (radio 14, como el buscador del prototipo). Variantes: texto, teléfono, pesos (prefijo `$`), área (con contador) y selección.
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
      <textarea
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
          className={cn(CONTROL, "h-[52px] appearance-none pr-10")}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-texto-secundario"
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
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-bold text-texto-secundario"
          >
            $
          </span>
        ) : null}
        <input
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
      <label htmlFor={id} className="text-sm font-semibold text-texto">
        {etiqueta}
      </label>
      {control}
      {error ? (
        <p id={idError} className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
      {ayuda ? (
        <p id={idAyuda} className="text-sm text-texto-terciario">
          {ayuda}
        </p>
      ) : null}
      {maxLength ? (
        <p id={idContador} className="self-end font-mono text-xs font-medium text-texto-terciario">
          {largo}/{maxLength}
        </p>
      ) : null}
    </div>
  );
}
