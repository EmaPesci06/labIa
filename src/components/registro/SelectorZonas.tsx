"use client";

import { useId, useState } from "react";

import { Campo } from "@/components/ui/Campo";
import { Chip } from "@/components/ui/Chip";
import { BARRIOS_FRECUENTES, MAX_BARRIOS } from "@/lib/validaciones/perfil-profesional";
import type { BarrioOpcion } from "@/lib/registro/tipos";

export type ZonasElegidas = { todaLaCiudad: boolean; zonas: number[] };

type Props = {
  valor: ZonasElegidas;
  onChange: (valor: ZonasElegidas) => void;
  /** Todos los barrios (para el buscador de "Otro barrio"). */
  barrios: BarrioOpcion[];
  error?: string;
};

const sinAcentos = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * "Dónde trabajás": chip "Toda la ciudad", barrios frecuentes y un buscador para cualquier otro
 * barrio. "Toda la ciudad" desmarca el resto; hasta 10 barrios. Manda los valores en campos
 * ocultos (`todaLaCiudad` y `zonas`).
 */
export function SelectorZonas({ valor, onChange, barrios, error }: Props) {
  const idError = useId();
  const [buscando, setBuscando] = useState(false);
  const [consulta, setConsulta] = useState("");

  const { todaLaCiudad, zonas } = valor;
  const nombreDe = (id: number) =>
    barrios.find((b) => b.id === id)?.nombre ??
    BARRIOS_FRECUENTES.find((b) => b.id === id)?.nombre ??
    `Barrio ${id}`;
  const frecuentes: number[] = BARRIOS_FRECUENTES.map((b) => b.id);
  const otrosElegidos = zonas.filter((id) => !frecuentes.includes(id));
  const llegoAlMaximo = zonas.length >= MAX_BARRIOS;

  function alternar(id: number) {
    if (zonas.includes(id)) {
      onChange({ todaLaCiudad: false, zonas: zonas.filter((z) => z !== id) });
    } else if (!llegoAlMaximo) {
      onChange({ todaLaCiudad: false, zonas: [...zonas, id] });
    }
  }

  const coincidencias = consulta.trim()
    ? barrios
        .filter((b) => !zonas.includes(b.id) && sinAcentos(b.nombre).includes(sinAcentos(consulta)))
        .slice(0, 8)
    : [];

  return (
    <div
      className="flex flex-col gap-2.5"
      data-grupo-invalido={error ? "" : undefined}
      tabIndex={error ? -1 : undefined}
      aria-describedby={error ? idError : undefined}
    >
      <input type="hidden" name="todaLaCiudad" value={todaLaCiudad ? "true" : "false"} />
      {zonas.map((id) => (
        <input key={id} type="hidden" name="zonas" value={id} />
      ))}

      <div role="group" aria-label="Zonas donde trabajás" className="flex flex-wrap gap-x-2">
        <Chip
          seleccionado={todaLaCiudad}
          onClick={() =>
            onChange(
              todaLaCiudad ? { todaLaCiudad: false, zonas } : { todaLaCiudad: true, zonas: [] },
            )
          }
        >
          Toda la ciudad
        </Chip>
        {BARRIOS_FRECUENTES.map((barrio) => (
          <Chip
            key={barrio.id}
            seleccionado={zonas.includes(barrio.id)}
            disabled={llegoAlMaximo && !zonas.includes(barrio.id)}
            onClick={() => alternar(barrio.id)}
          >
            {barrio.nombre}
          </Chip>
        ))}
        {otrosElegidos.map((id) => (
          <Chip key={id} seleccionado onClick={() => alternar(id)}>
            {nombreDe(id)}
          </Chip>
        ))}
        <Chip
          seleccionado={buscando}
          disabled={llegoAlMaximo && !buscando}
          onClick={() => setBuscando((abierto) => !abierto)}
        >
          Otro barrio
        </Chip>
      </div>

      {buscando ? (
        <div className="flex flex-col gap-2">
          <Campo
            etiqueta="Buscá tu barrio"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Ej: Playa Grande"
            autoComplete="off"
            enterKeyHint="search"
            onKeyDown={(evento) => {
              // Enter dentro del buscador no tiene que enviar el formulario.
              if (evento.key === "Enter") evento.preventDefault();
            }}
          />
          {consulta.trim() ? (
            coincidencias.length > 0 ? (
              <ul className="flex flex-wrap gap-x-2" aria-label="Barrios encontrados">
                {coincidencias.map((barrio) => (
                  <li key={barrio.id}>
                    <Chip
                      seleccionado={false}
                      onClick={() => {
                        alternar(barrio.id);
                        setConsulta("");
                      }}
                    >
                      {barrio.nombre}
                    </Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="text-sm text-texto-secundario">
                No encontramos ese barrio. Probá con otra parte del nombre.
              </p>
            )
          ) : null}
        </div>
      ) : null}

      {llegoAlMaximo ? (
        <p role="status" className="text-sm text-texto-terciario">
          Llegaste al máximo de {MAX_BARRIOS} barrios. Para sumar otro, sacá uno.
        </p>
      ) : null}
      {error ? (
        <p id={idError} className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
