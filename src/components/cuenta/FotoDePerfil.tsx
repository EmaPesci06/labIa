"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { guardarFotoDePerfil } from "@/lib/cuenta/acciones";
import { comprimirImagen, TIPOS_IMAGEN_ACEPTADOS } from "@/lib/imagen";
import { crearClienteNavegador } from "@/lib/supabase/navegador";

type Props = { uid: string; nombre: string; fotoUrl: string | null };

/** Cambiar o quitar la foto de perfil: se comprime en el navegador y sube a `fotos/perfiles/<uid>`. */
export function FotoDePerfil({ uid, nombre, fotoUrl }: Props) {
  const router = useRouter();
  const idError = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegir(archivo: File) {
    setOcupado(true);
    setError(null);
    try {
      const blob = await comprimirImagen(archivo, { cuadrada: true });
      const ruta = `perfiles/${uid}/${Date.now()}.jpg`;
      const { error: errorSubida } = await crearClienteNavegador()
        .storage.from("fotos")
        .upload(ruta, blob, { contentType: "image/jpeg" });
      if (errorSubida) throw new Error("No pudimos subir la foto. Probá de nuevo.");
      const guardado = await guardarFotoDePerfil(ruta);
      if (!guardado.ok) throw new Error(guardado.mensaje ?? "No pudimos guardar la foto.");
      router.refresh();
    } catch (excepcion) {
      setError(excepcion instanceof Error ? excepcion.message : "No pudimos usar esa foto.");
    } finally {
      setOcupado(false);
    }
  }

  async function quitar() {
    setOcupado(true);
    setError(null);
    const guardado = await guardarFotoDePerfil(null);
    if (!guardado.ok) setError(guardado.mensaje ?? "No pudimos quitar la foto.");
    else router.refresh();
    setOcupado(false);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar nombre={nombre} src={fotoUrl} tamano={84} />
      <div className="flex flex-col items-start gap-1">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-campo border-[1.5px] border-borde bg-superficie px-4 text-[15px] font-bold text-texto hover:bg-azul-suave has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco">
          {ocupado ? "Procesando…" : fotoUrl ? "Cambiar foto" : "Subir foto"}
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_IMAGEN_ACEPTADOS.join(",")}
            disabled={ocupado}
            aria-describedby={error ? idError : undefined}
            className="sr-only"
            onChange={(evento) => {
              const archivo = evento.target.files?.[0];
              evento.target.value = "";
              if (archivo) void elegir(archivo);
            }}
          />
        </label>
        {fotoUrl ? (
          <button
            type="button"
            onClick={quitar}
            disabled={ocupado}
            className="min-h-11 rounded-campo px-2 text-sm font-bold text-azul underline underline-offset-2"
          >
            Quitar foto
          </button>
        ) : null}
        {error ? (
          <p id={idError} role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
