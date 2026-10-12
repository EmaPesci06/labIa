"use client";

import { ImageIcon, User, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef } from "react";

import { cn } from "@/lib/cn";
import { TIPOS_IMAGEN_ACEPTADOS } from "@/lib/imagen";
import { MAX_FOTOS_TRABAJOS } from "@/lib/validaciones/perfil-profesional";

/** Una foto del formulario: ya subida (`ruta`) o pendiente de subir (`blob`). */
export type FotoLocal = {
  id: string;
  /** Ruta en el bucket `fotos` si ya está subida. */
  ruta: string | null;
  /** Imagen comprimida que se sube al guardar. */
  blob: Blob | null;
  /** URL para mostrarla (pública o `blob:`). */
  vista: string;
};

const ACEPTADOS = TIPOS_IMAGEN_ACEPTADOS.join(",");

const BASE_MOSAICO =
  "relative flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden " +
  "rounded-[14px] border-[1.5px] border-dashed border-borde bg-superficie text-center text-sm font-semibold " +
  "text-texto hover:bg-azul-suave has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 " +
  "has-[:focus-visible]:outline-foco lg:min-h-24 lg:text-[15px]";

type PropsPerfil = {
  foto: FotoLocal | null;
  onElegir: (archivo: File) => void;
  onQuitar: () => void;
  ocupado: boolean;
  error?: string;
};

/** Foto de perfil: un mosaico para elegir la foto (se recorta en cuadrado al comprimir). */
export function CargaFotoPerfil({ foto, onElegir, onQuitar, ocupado, error }: PropsPerfil) {
  const entrada = useRef<HTMLInputElement>(null);
  const idError = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label className={cn(BASE_MOSAICO, ocupado && "opacity-60")}>
        {foto ? (
          <Image
            src={foto.vista}
            alt="Tu foto de perfil"
            fill
            sizes="(min-width: 1024px) 280px, 50vw"
            className="object-cover"
          />
        ) : (
          <>
            <User aria-hidden strokeWidth={2} className="size-6 text-azul" />
            <span>
              Foto de perfil
              <span className="hidden lg:inline"> (recomendada)</span>
            </span>
          </>
        )}
        <input
          ref={entrada}
          type="file"
          accept={ACEPTADOS}
          disabled={ocupado}
          aria-describedby={error ? idError : undefined}
          className="sr-only"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            evento.target.value = "";
            if (archivo) onElegir(archivo);
          }}
        />
      </label>
      {foto ? (
        <button
          type="button"
          onClick={onQuitar}
          className="min-h-11 self-start rounded-campo px-2 text-sm font-bold text-azul underline underline-offset-2"
        >
          Quitar foto de perfil
        </button>
      ) : null}
      {error ? (
        <p id={idError} className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PropsTrabajos = {
  fotos: FotoLocal[];
  onElegir: (archivos: File[]) => void;
  onQuitar: (id: string) => void;
  ocupado: boolean;
  error?: string;
};

/** Fotos de trabajos: mosaico para agregar y grilla con las elegidas, cada una con "Quitar". */
export function CargaFotosTrabajos({ fotos, onElegir, onQuitar, ocupado, error }: PropsTrabajos) {
  const idError = useId();
  const lleno = fotos.length >= MAX_FOTOS_TRABAJOS;
  return (
    <div className="flex flex-col gap-2.5">
      <label className={cn(BASE_MOSAICO, (ocupado || lleno) && "cursor-not-allowed opacity-60")}>
        <ImageIcon aria-hidden strokeWidth={2} className="size-6 text-azul" />
        <span>
          Fotos de trabajos
          <span className="hidden lg:inline"> (hasta {MAX_FOTOS_TRABAJOS})</span>
        </span>
        <span className="text-xs font-normal text-texto-terciario lg:hidden">
          Hasta {MAX_FOTOS_TRABAJOS}
        </span>
        <input
          type="file"
          accept={ACEPTADOS}
          multiple
          disabled={ocupado || lleno}
          aria-describedby={error ? idError : undefined}
          className="sr-only"
          onChange={(evento) => {
            const archivos = Array.from(evento.target.files ?? []);
            evento.target.value = "";
            if (archivos.length > 0) onElegir(archivos);
          }}
        />
      </label>
      {fotos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {fotos.map((foto, indice) => (
            <li key={foto.id} className="relative aspect-square overflow-hidden rounded-campo">
              <Image
                src={foto.vista}
                alt={`Foto de trabajo ${indice + 1}`}
                fill
                sizes="(min-width: 1024px) 120px, 33vw"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onQuitar(foto.id)}
                aria-label={`Quitar foto de trabajo ${indice + 1}`}
                className="absolute top-0.5 right-0.5 flex size-11 items-start justify-end p-1.5"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-azul text-sobre-azul">
                  <X aria-hidden strokeWidth={2.5} className="size-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-texto-terciario" role="status">
        {fotos.length} de {MAX_FOTOS_TRABAJOS} fotos
      </p>
      {error ? (
        <p id={idError} className="text-sm font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
