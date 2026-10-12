"use client";

import { Check, Lock } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { GrupoChips } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import {
  BARRIOS_FRECUENTES,
  normalizarBusqueda,
  type BarrioOpcion,
} from "@/lib/validaciones/registro-cliente";

const OTRO = "otro";
const MAXIMO_RESULTADOS = 8;

type Props = {
  /** Todos los barrios de la tabla `barrios`. Vacío: solo se ofrecen los 7 más comunes. */
  barrios: BarrioOpcion[];
  /** Id del barrio elegido (texto) para repoblar el formulario. */
  valorInicial?: string;
  error?: string;
  /** Nombre del campo oculto que viaja al servidor. */
  name?: string;
};

/**
 * "Tu barrio": 7 chips con los barrios más comunes y "Otro barrio", que abre un buscador
 * (combobox accesible) con todos los de la tabla, filtrado por texto sin acentos.
 * Manda el id del barrio en un campo oculto. Nunca se pide la dirección.
 */
export function SelectorBarrio({ barrios, valorInicial = "", error, name = "barrio" }: Props) {
  const id = useId();
  const idError = `${id}-error`;
  const idAviso = `${id}-aviso`;
  const idLista = `${id}-lista`;

  const esFrecuente = BARRIOS_FRECUENTES.some((b) => String(b.id) === valorInicial);
  const nombreInicial = barrios.find((b) => String(b.id) === valorInicial)?.nombre ?? "";

  const [valor, setValor] = useState(valorInicial);
  const [abiertoOtro, setAbiertoOtro] = useState(Boolean(valorInicial) && !esFrecuente);
  const [consulta, setConsulta] = useState(esFrecuente ? "" : nombreInicial);
  const [listaVisible, setListaVisible] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(0);

  const resultados = useMemo(() => {
    const buscada = normalizarBusqueda(consulta);
    const coinciden = buscada
      ? barrios.filter((b) => normalizarBusqueda(b.nombre).includes(buscada))
      : barrios;
    return coinciden.slice(0, MAXIMO_RESULTADOS);
  }, [barrios, consulta]);

  const chipActivo = esFrecuenteElegido(valor) ? valor : abiertoOtro ? OTRO : "";
  const opciones = [
    ...BARRIOS_FRECUENTES.map((b) => ({ valor: String(b.id), etiqueta: b.nombre })),
    ...(barrios.length ? [{ valor: OTRO, etiqueta: "Otro barrio" }] : []),
  ];

  function elegirChip(nuevo: string) {
    if (nuevo === OTRO) {
      setAbiertoOtro(true);
      // Si venía de un chip frecuente, se pide elegir de nuevo en el buscador.
      if (esFrecuenteElegido(valor)) setValor("");
      return;
    }
    setAbiertoOtro(false);
    setValor(nuevo);
    setConsulta("");
    setListaVisible(false);
  }

  function elegirDeLista(barrio: BarrioOpcion) {
    setValor(String(barrio.id));
    setConsulta(barrio.nombre);
    setListaVisible(false);
  }

  function alTeclear(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setListaVisible(true);
      setIndiceActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (evento.key === "Enter" && listaVisible) {
      const elegido = resultados[indiceActivo];
      if (elegido) {
        evento.preventDefault();
        elegirDeLista(elegido);
      }
    } else if (evento.key === "Escape") {
      setListaVisible(false);
    }
  }

  return (
    <fieldset
      className="flex min-w-0 flex-col gap-1.5"
      aria-describedby={error ? `${idError} ${idAviso}` : idAviso}
    >
      <legend className="mb-1.5 text-sm font-semibold text-texto">Tu barrio</legend>
      <input type="hidden" name={name} value={valor} />
      <GrupoChips
        tipo="unica"
        etiqueta="Tu barrio"
        opciones={opciones}
        valor={chipActivo || null}
        onChange={elegirChip}
      />

      {abiertoOtro ? (
        <div className="relative flex flex-col gap-1.5">
          <label htmlFor={`${id}-buscar`} className="text-sm font-semibold text-texto">
            Buscá tu barrio
          </label>
          <input
            id={`${id}-buscar`}
            type="text"
            role="combobox"
            aria-expanded={listaVisible}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={listaVisible ? `${id}-op-${indiceActivo}` : undefined}
            autoComplete="off"
            value={consulta}
            placeholder="Ej.: Playa Grande"
            onChange={(e) => {
              setConsulta(e.target.value);
              setValor("");
              setIndiceActivo(0);
              setListaVisible(true);
            }}
            onFocus={() => setListaVisible(true)}
            onBlur={() => setListaVisible(false)}
            onKeyDown={alTeclear}
            className="h-[52px] w-full rounded-boton border border-borde bg-superficie px-3.5 text-base text-texto placeholder:text-texto-terciario"
          />
          <ul
            id={idLista}
            role="listbox"
            aria-label="Barrios"
            hidden={!listaVisible}
            className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-auto rounded-campo border border-borde bg-superficie-elevada py-1 shadow-lg"
          >
            {resultados.length === 0 ? (
              <li role="presentation" className="px-3.5 py-3 text-sm text-texto-secundario">
                No encontramos ese barrio.
              </li>
            ) : (
              resultados.map((barrio, i) => (
                <li
                  key={barrio.id}
                  id={`${id}-op-${i}`}
                  role="option"
                  aria-selected={String(barrio.id) === valor}
                  // Con mousedown se elige antes de que el campo pierda el foco.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegirDeLista(barrio);
                  }}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-between px-3.5 text-[15px] text-texto",
                    i === indiceActivo && "bg-azul-suave",
                  )}
                >
                  {barrio.nombre}
                  {String(barrio.id) === valor ? (
                    <Check aria-hidden strokeWidth={2} className="size-4" />
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p id={idError} className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
      <p
        id={idAviso}
        className="flex items-start gap-2 text-[13px] leading-snug text-texto-secundario"
      >
        <Lock aria-hidden strokeWidth={2} className="mt-px size-[18px] shrink-0 text-azul" />
        Tu dirección exacta nunca se muestra. Solo tu barrio.
      </p>
    </fieldset>
  );
}

function esFrecuenteElegido(valor: string): boolean {
  return BARRIOS_FRECUENTES.some((b) => String(b.id) === valor);
}
