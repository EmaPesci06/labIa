"use client";

import { useEffect, useState, useTransition } from "react";

import { Aviso } from "@/components/ui/Aviso";
import { Boton } from "@/components/ui/Boton";
import { Chip } from "@/components/ui/Chip";
import { Estrellas } from "@/components/ui/Estrellas";
import { HojaInferior } from "@/components/ui/HojaInferior";
import {
  consultarElegibilidadResena,
  guardarResena,
  type ResenaPropia,
} from "@/lib/resenas/acciones";
import { CHIPS_RAPIDOS, ETIQUETAS_PUNTAJE } from "@/lib/validaciones/resenas";

export type HojaResenaProps = {
  abierta: boolean;
  onCambioAbierta: (abierta: boolean) => void;
  profesionalId: string;
  nombreProfesional: string;
  trabajoId?: string | null;
  resenaExistente?: {
    id: string;
    puntaje: number;
    texto: string | null;
  } | null;
  alGuardar?: () => void;
  devolverFocoA?: { current: HTMLElement | null };
};

/**
 * Hoja inferior "¿Cómo te fue con <nombre>?" (LAB-31).
 * Permite calificar de 1 a 5 estrellas con etiquetas accesibles,
 * agregar chips rápidos opcionales y escribir un comentario de hasta 500 caracteres.
 */
export function HojaResena({
  abierta,
  onCambioAbierta,
  profesionalId,
  nombreProfesional,
  trabajoId,
  resenaExistente,
  alGuardar,
  devolverFocoA,
}: HojaResenaProps) {
  const esModoEdicion = Boolean(resenaExistente);
  const titulo = esModoEdicion
    ? `Editar reseña de ${nombreProfesional}`
    : `¿Cómo te fue con ${nombreProfesional}?`;

  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={onCambioAbierta}
      titulo={titulo}
      devolverFocoA={devolverFocoA}
    >
      {abierta ? (
        <FormularioResena
          profesionalId={profesionalId}
          nombreProfesional={nombreProfesional}
          trabajoId={trabajoId}
          resenaExistente={resenaExistente}
          alGuardar={() => {
            onCambioAbierta(false);
            alGuardar?.();
          }}
        />
      ) : null}
    </HojaInferior>
  );
}

function FormularioResena({
  profesionalId,
  trabajoId,
  resenaExistente,
  alGuardar,
}: {
  profesionalId: string;
  nombreProfesional: string;
  trabajoId?: string | null;
  resenaExistente?: {
    id?: string;
    puntaje: number;
    texto: string | null;
  } | null;
  alGuardar: () => void;
}) {
  const [puntaje, setPuntaje] = useState<number>(resenaExistente?.puntaje ?? 0);
  const [texto, setTexto] = useState<string>(resenaExistente?.texto ?? "");
  const [resenaCargada, setResenaCargada] = useState<ResenaPropia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTexto, setErrorTexto] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  useEffect(() => {
    let activo = true;
    if (resenaExistente === undefined) {
      consultarElegibilidadResena(profesionalId)
        .then((res) => {
          if (activo && res.resenaPropia) {
            setResenaCargada(res.resenaPropia);
            setPuntaje(res.resenaPropia.puntaje);
            setTexto(res.resenaPropia.texto ?? "");
          }
        })
        .catch(() => {});
    }
    return () => {
      activo = false;
    };
  }, [profesionalId, resenaExistente]);

  function alternarChip(chip: string) {
    const yaEsta = texto.includes(chip);
    if (yaEsta) {
      const nuevo = texto
        .replace(chip, "")
        .replace(/\.\s*\./g, ".")
        .replace(/^\s*\.\s*/, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      setTexto(nuevo);
    } else {
      const limpio = texto.trim();
      if (!limpio) {
        setTexto(chip);
      } else {
        const conPunto = limpio.endsWith(".") ? limpio : `${limpio}.`;
        setTexto(`${conPunto} ${chip}`);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // El botón está deshabilitado sin estrellas: no hace falta validar la calificación acá.
    setError(null);
    setErrorTexto(null);
    startTransition(async () => {
      const res = await guardarResena({
        profesionalId,
        puntaje,
        texto,
        trabajoId: trabajoId ?? undefined,
      });

      if (!res.ok) {
        if (res.codigo === "texto") {
          setErrorTexto(res.error);
        } else {
          setError(res.error);
        }
        return;
      }

      alGuardar();
    });
  }

  const esModoEdicion = Boolean(resenaExistente ?? resenaCargada);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Calificación por estrellas */}
      <div className="flex flex-col items-center gap-1.5 py-1 text-center">
        <Estrellas
          valor={puntaje}
          onChange={(nuevo) => {
            setPuntaje(nuevo);
            setError(null);
          }}
          etiquetasPuntaje={ETIQUETAS_PUNTAJE}
          etiqueta="Calificación del profesional"
        />
        <p aria-live="polite" className="min-h-5 text-sm font-semibold text-texto-secundario">
          {ETIQUETAS_PUNTAJE[puntaje] ?? "Tocá una estrella para calificar"}
        </p>
      </div>

      {/* Chips rápidos */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-texto-secundario">
          Opciones rápidas para sumar al comentario
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CHIPS_RAPIDOS.map((chip) => {
            const seleccionado = texto.includes(chip);
            return (
              <Chip key={chip} seleccionado={seleccionado} onClick={() => alternarChip(chip)}>
                {chip}
              </Chip>
            );
          })}
        </div>
      </div>

      {/* Campo comentario */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="comentario-resena" className="text-sm font-bold text-texto">
          Comentario (opcional)
        </label>
        <textarea
          id="comentario-resena"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErrorTexto(null);
          }}
          maxLength={500}
          rows={3}
          aria-invalid={errorTexto ? true : undefined}
          aria-describedby={errorTexto ? "error-comentario-resena" : undefined}
          placeholder="Contá cómo fue: puntualidad, prolijidad, si respetó el presupuesto."
          className="w-full resize-none rounded-campo border border-borde bg-superficie p-3 text-[15px] leading-relaxed text-texto placeholder:text-texto-terciario focus:border-azul focus:ring-1 focus:ring-azul focus:outline-none"
        />
        {errorTexto ? (
          <p id="error-comentario-resena" role="alert" className="text-sm font-semibold text-error">
            {errorTexto}
          </p>
        ) : null}
        <div className="flex justify-between text-xs text-texto-secundario">
          <span>Máximo 500 caracteres</span>
          <span>{texto.length}/500</span>
        </div>
      </div>

      {/* Aviso de privacidad y normas */}
      <Aviso>Tu reseña es pública y aparece con tu nombre y la inicial de tu apellido.</Aviso>

      {/* Mensaje de error */}
      {error ? (
        <div
          role="alert"
          className="rounded-[14px] border border-error/20 bg-error/10 p-3 text-sm font-semibold text-error"
        >
          {error}
        </div>
      ) : null}

      {/* Botón de publicar */}
      <div className="pt-1">
        <Boton
          type="submit"
          cargando={pendiente}
          disabled={puntaje === 0 || pendiente}
          variante="cliente"
          tamano="grande"
          bloque
        >
          {esModoEdicion ? "Guardar cambios" : "Publicar reseña"}
        </Boton>
      </div>
    </form>
  );
}
