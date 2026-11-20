"use client";

import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/cn";

import { SIN_ANILLO } from "./foco";

export type OpcionSeleccion = {
  valor: string;
  etiqueta: string;
  disabled?: boolean;
};

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
  opciones: readonly OpcionSeleccion[];
  placeholder?: string;
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (valor: string) => void;
  disabled?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
};

export type CampoProps = PropsTexto | PropsArea | PropsSeleccion;

// Capa fina sobre `Input`, `Textarea` y `Select` de shadcn. Radio de shadcn, borde de 2 px color
// `borde` (3:1 sobre superficie y fondo, más visible que el `--input` de shadcn), 3 px con error.
// Fondo `campo` en los dos temas (shadcn pinta `input/30` en oscuro). Texto de 17 px: evita el zoom
// de iOS. Un solo foco: el outline de globals.css, sin el anillo de shadcn.
const CONTROL =
  "w-full border-2 border-borde bg-campo px-3.5 text-[17px] text-foreground md:text-[17px] dark:bg-campo " +
  "focus-visible:border-borde aria-invalid:border-[3px] aria-invalid:border-error " +
  "dark:aria-invalid:border-error " +
  SIN_ANILLO;

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
  const [anuncio, setAnuncio] = useState("");

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
    const { opciones, placeholder, name, value, defaultValue, onValueChange, disabled, required } =
      props;
    const tieneVacio = opciones.some((o) => o.valor === "");
    const valorNormalizado =
      value === undefined ? undefined : value === "" && !tieneVacio ? null : value;
    const valorInicialNormalizado =
      defaultValue === undefined
        ? undefined
        : defaultValue === "" && !tieneVacio
          ? null
          : defaultValue;
    const items = opciones.map((o) => ({ value: o.valor, label: o.etiqueta }));

    control = (
      <>
        <Select
          name={name}
          items={items}
          value={valorNormalizado}
          defaultValue={valorInicialNormalizado}
          disabled={disabled}
          required={required}
          onValueChange={(nuevo) => {
            const valor = nuevo ?? "";
            onValueChange?.(valor);
            const elegida = opciones.find((o) => o.valor === valor);
            if (elegida) setAnuncio(`${etiqueta}: ${elegida.etiqueta}`);
          }}
        >
          <SelectTrigger
            {...comunes}
            className={cn(
              CONTROL,
              "h-[52px] w-full cursor-pointer justify-between rounded-lg data-[size=default]:h-[52px] dark:hover:bg-campo",
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className="rounded-lg border-2 border-borde bg-popover text-popover-foreground shadow-md"
          >
            {opciones.map((opcion) => (
              <SelectItem
                key={opcion.valor}
                value={opcion.valor}
                disabled={opcion.disabled}
                className="min-h-11 cursor-pointer rounded-md px-3 text-base font-normal text-texto focus:bg-sol focus:font-bold focus:text-sobre-sol"
              >
                {opcion.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span role="status" aria-live="polite" className="sr-only">
          {anuncio}
        </span>
      </>
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
