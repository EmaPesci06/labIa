"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn/command";
import { Label } from "@/components/shadcn/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { cn } from "@/lib/cn";

import { SIN_ANILLO } from "./foco";

export type OpcionCombobox = {
  valor: string;
  etiqueta: string;
};

type PropsBase = {
  /** Etiqueta visible (en aspecto `campo`) o nombre accesible (en aspecto `pastilla`). */
  etiqueta: string;
  opciones: readonly OpcionCombobox[];
  /** Valor controlado. */
  value?: string;
  /** Valor inicial sin controlar. */
  defaultValue?: string;
  onValueChange?: (valor: string) => void;
  placeholder?: string;
  placeholderBusqueda?: string;
  sinResultados?: string;
  /** Nombre del campo para formularios (renderiza un `<input type="hidden">`). */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
};

type PropsCampo = PropsBase & {
  aspecto?: "campo";
  ayuda?: string;
  error?: string;
};

type PropsPastilla = PropsBase & {
  aspecto: "pastilla";
  /** Texto antes del valor dentro de la píldora ("Estás en"). */
  prefijo?: string;
  /** Borde de 2 px color texto (barra superior). */
  borde?: boolean;
};

export type ComboboxProps = PropsCampo | PropsPastilla;

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrarOpciones(valor: string, busqueda: string): number {
  const filtro = normalizarTexto(busqueda);
  if (!filtro) return 1;
  const objetivo = normalizarTexto(valor);
  if (objetivo.startsWith(filtro)) return 2;
  if (objetivo.includes(filtro)) return 1;
  return 0;
}

/**
 * Selector con búsqueda construido sobre `Popover` y `Command` de shadcn.
 * Se maneja con teclado (flechas, Enter, Esc), filtra sin distinguir acentos y anuncia
 * la opción elegida al lector de pantalla.
 */
export function Combobox(props: ComboboxProps) {
  const idGenerado = useId();
  const id = props.id ?? idGenerado;
  const idLista = `${id}-lista`;
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  const esControlado = props.value !== undefined;
  const [valorInterno, setValorInterno] = useState(props.defaultValue ?? "");
  const valorActual = esControlado ? props.value : valorInterno;

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [anuncio, setAnuncio] = useState("");

  const opcionElegida = props.opciones.find((o) => o.valor === valorActual);
  const placeholder = props.placeholder ?? "Elegí una opción";
  const placeholderBusqueda = props.placeholderBusqueda ?? "Buscá…";
  const sinResultados = props.sinResultados ?? "Sin resultados.";

  function cambiarAbierto(siguiente: boolean) {
    setAbierto(siguiente);
    if (!siguiente) setBusqueda("");
  }

  function elegir(opcion: OpcionCombobox) {
    if (!esControlado) setValorInterno(opcion.valor);
    props.onValueChange?.(opcion.valor);
    setAnuncio(`${props.etiqueta}: ${opcion.etiqueta}`);
    cambiarAbierto(false);
  }

  const contenido = (
    <PopoverContent
      align="start"
      sideOffset={6}
      className="w-(--anchor-width) min-w-64 rounded-lg border-2 border-borde bg-popover p-0 text-popover-foreground shadow-md"
    >
      <Command
        filter={filtrarOpciones}
        className="rounded-lg bg-popover text-popover-foreground [&_[data-slot=input-group]]:h-11! [&_[data-slot=input-group]]:border-borde [&_[data-slot=input-group]]:bg-campo"
      >
        <CommandInput
          value={busqueda}
          onValueChange={setBusqueda}
          placeholder={placeholderBusqueda}
          aria-label="Filtrar opciones"
          autoFocus
          className="h-11 text-base text-texto placeholder:text-texto-suave"
        />
        <CommandList id={idLista} className="max-h-64 p-1">
          <CommandEmpty className="py-4 text-center text-sm text-texto-suave">
            {sinResultados}
          </CommandEmpty>
          <CommandGroup className="p-0">
            {props.opciones.map((opcion) => {
              const seleccionado = opcion.valor === valorActual;
              return (
                <CommandItem
                  key={opcion.valor}
                  value={opcion.etiqueta}
                  data-checked={seleccionado ? "true" : undefined}
                  onSelect={() => elegir(opcion)}
                  className="min-h-11 cursor-pointer rounded-md px-3 text-base font-normal text-texto data-selected:bg-sol data-selected:font-bold data-selected:text-sobre-sol data-selected:*:[svg]:text-sobre-sol"
                >
                  <span className="truncate">{opcion.etiqueta}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );

  if (props.aspecto === "pastilla") {
    const { etiqueta, prefijo, borde = false, disabled = false, className, name } = props;
    return (
      <div className="inline-flex min-w-0">
        {name ? <input type="hidden" name={name} value={valorActual} /> : null}
        <Popover open={abierto} onOpenChange={cambiarAbierto}>
          <PopoverTrigger
            id={id}
            role="combobox"
            aria-label={prefijo ? `${prefijo}: ${etiqueta}` : etiqueta}
            aria-expanded={abierto}
            aria-haspopup="listbox"
            aria-controls={idLista}
            disabled={disabled}
            onKeyDown={(evento) => {
              if (!abierto && (evento.key === "ArrowDown" || evento.key === "ArrowUp")) {
                evento.preventDefault();
                cambiarAbierto(true);
              }
            }}
            className={cn(
              "inline-flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full bg-superficie pr-3 pl-4 text-base font-bold text-texto disabled:cursor-not-allowed disabled:opacity-60",
              borde && "border-2 border-texto",
              SIN_ANILLO,
              className,
            )}
          >
            {prefijo ? <span className="shrink-0 text-[15px] font-normal">{prefijo}</span> : null}
            <span className="min-w-0 flex-1 truncate text-left">
              {opcionElegida ? opcionElegida.etiqueta : placeholder}
            </span>
            <ChevronDown aria-hidden strokeWidth={2.5} className="size-4 shrink-0" />
          </PopoverTrigger>
          {contenido}
        </Popover>
        <span role="status" aria-live="polite" className="sr-only">
          {anuncio}
        </span>
      </div>
    );
  }

  const { etiqueta, ayuda, error, className, disabled = false, required, name } = props;
  const describedBy =
    [error ? idError : undefined, ayuda ? idAyuda : undefined, props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {name ? <input type="hidden" name={name} value={valorActual} /> : null}
      <Label htmlFor={id} className="text-base leading-normal font-bold text-foreground">
        {etiqueta}
      </Label>
      <Popover open={abierto} onOpenChange={cambiarAbierto}>
        <PopoverTrigger
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-haspopup="listbox"
          aria-controls={idLista}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          disabled={disabled}
          onKeyDown={(evento) => {
            if (!abierto && (evento.key === "ArrowDown" || evento.key === "ArrowUp")) {
              evento.preventDefault();
              cambiarAbierto(true);
            }
          }}
          className={cn(
            "flex h-[52px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-2 border-borde bg-campo px-3.5 text-left text-[17px] text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            "aria-invalid:border-[3px] aria-invalid:border-error dark:aria-invalid:border-error",
            SIN_ANILLO,
          )}
        >
          <span className={cn("truncate", !opcionElegida && "text-texto-suave")}>
            {opcionElegida ? opcionElegida.etiqueta : placeholder}
          </span>
          <ChevronDown aria-hidden strokeWidth={2.5} className="size-5 shrink-0 text-texto" />
        </PopoverTrigger>
        {contenido}
      </Popover>
      <span role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </span>
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
    </div>
  );
}
