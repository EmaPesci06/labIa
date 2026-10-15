"use client";

import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import { BotonReportar } from "@/components/reportes/BotonReportar";
import { cargarMasResenas } from "@/lib/perfil/acciones";
import type { ResenaPerfil } from "@/lib/perfil/cargar";
import { textoPuntaje } from "@/lib/perfil/datos";

type Props = {
  profesionalId: string;
  /** Las primeras reseñas (las 3 más recientes), ya cargadas por el servidor. */
  iniciales: readonly ResenaPerfil[];
  /** Cantidad total de reseñas del profesional. */
  total: number;
};

/**
 * Reseñas del perfil: las 3 más recientes y "Ver todas (23)", que va sumando el resto de a 10
 * (Server Action `cargarMasResenas`). Sin reseñas dice "Todavía no tiene reseñas.".
 */
export function ListaResenas({ profesionalId, iniciales, total }: Props) {
  const [resenas, setResenas] = useState<readonly ResenaPerfil[]>(iniciales);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  const faltan = Math.max(0, total - resenas.length);
  const yaDesplego = resenas.length > iniciales.length;

  if (resenas.length === 0) {
    return <p className="text-[15px] text-texto-secundario">Todavía no tiene reseñas.</p>;
  }

  function verMas() {
    setError(null);
    empezar(async () => {
      const respuesta = await cargarMasResenas(profesionalId, resenas.length);
      if (!respuesta.ok) {
        setError(respuesta.mensaje);
        return;
      }
      setResenas((actuales) => {
        const vistas = new Set(actuales.map((r) => r.id));
        return [...actuales, ...respuesta.resenas.filter((r) => !vistas.has(r.id))];
      });
    });
  }

  return (
    <div className="flex flex-col gap-2.5 lg:gap-3">
      <ul className="flex flex-col gap-2.5 lg:gap-3">
        {resenas.map((resena) => (
          <li
            key={resena.id}
            className="flex flex-col gap-1.5 rounded-[14px] bg-superficie p-3.5 lg:rounded-2xl lg:p-[18px]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold lg:text-[15px]">
              <span>
                {resena.autor} · {textoPuntaje(resena.puntaje)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-normal text-texto-terciario">
                  {resena.cuando}
                </span>
                <BotonReportar
                  objetivoTipo="resena"
                  objetivoId={resena.id}
                  tituloObjetivo={`Reseña de ${resena.autor}`}
                  texto="Reportar"
                  className="text-xs text-texto-terciario underline hover:text-texto"
                />
              </div>
            </div>
            {resena.texto ? (
              <p className="text-[15px] leading-snug text-texto lg:text-base lg:leading-normal">
                {resena.texto}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}

      {faltan > 0 ? (
        <Boton
          variante="secundario"
          cargando={pendiente}
          onClick={verMas}
          className="self-start"
          aria-live="polite"
        >
          {yaDesplego ? `Ver más reseñas (${faltan})` : `Ver todas (${total})`}
        </Boton>
      ) : null}
    </div>
  );
}
