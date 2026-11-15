"use client";

import { X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { ConsentimientoDatosSensibles } from "@/components/legales/ConsentimientoDatosSensibles";
import { cn } from "@/lib/cn";
import type { ItemVerificacion } from "@/lib/registro/tipos";
import {
  errorDeArchivoDocumento,
  MIMES_DOCUMENTO_ACEPTADOS,
  tipoPorCabecera,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";

const ACEPTADOS = ".jpg,.jpeg,.png,.webp,.pdf," + MIMES_DOCUMENTO_ACEPTADOS.join(",");
const URL_REINCIDENCIA = "https://www.argentina.gob.ar/justicia/reincidencia/antecedentespenales";

/** Primeros bytes del archivo, para comprobar que el contenido es lo que dice ser. */
async function leerCabecera(archivo: File): Promise<Uint8Array | null> {
  const trozo = archivo.slice(0, 12);
  try {
    if (typeof trozo.arrayBuffer === "function") return new Uint8Array(await trozo.arrayBuffer());
    return await new Promise((resolver) => {
      const lector = new FileReader();
      lector.onload = () => resolver(new Uint8Array(lector.result as ArrayBuffer));
      lector.onerror = () => resolver(null);
      lector.readAsArrayBuffer(trozo);
    });
  } catch {
    return null;
  }
}

type Props = {
  tieneGas?: boolean;
  verificaciones?: ItemVerificacion[];
  documentosLocales?: Partial<Record<TipoDocumento, File | null>>;
  onElegirDocumento?: (tipo: TipoDocumento, archivo: File) => void;
  onQuitarDocumento?: (tipo: TipoDocumento) => void;
  subidosAhora?: Partial<Record<TipoDocumento, boolean>>;
  progreso?: { hechos: number; total: number } | null;
  ocupado?: boolean;
  error?: string | null;
  consentimiento: { tildado: boolean; onCambio: (tildado: boolean) => void };
};

type DefinicionDocumento = {
  tipo: TipoDocumento;
  titulo: string;
  subtituloPendiente: string;
  camara: boolean;
};

/**
 * Paso 2 del registro profesional (`App-ProDocumentos` y `Oscuro-ProDocumentos`):
 * filas planas para DNI frente, DNI dorso, antecedentes y matrícula (si eligió gas), más el
 * consentimiento expreso para datos sensibles (LAB-43).
 */
export function PasoDocumentosProfesional({
  tieneGas = false,
  verificaciones = [],
  documentosLocales = {},
  onElegirDocumento,
  onQuitarDocumento,
  subidosAhora = {},
  progreso = null,
  ocupado = false,
  error,
  consentimiento,
}: Props) {
  const sinConsentimiento = !consentimiento.tildado;
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const base = useId();
  const idError = `${base}-error`;
  const describedBy = error || errorLocal ? idError : undefined;

  const verifPorTipo = verificaciones.reduce<Partial<Record<TipoDocumento, ItemVerificacion>>>(
    (acc, v) => {
      if (!acc[v.tipo]) acc[v.tipo] = v;
      return acc;
    },
    {},
  );

  async function manejarArchivo(tipo: TipoDocumento, archivo: File | undefined) {
    if (!archivo) return;
    setErrorLocal(null);

    const mensaje = errorDeArchivoDocumento(archivo);
    if (mensaje) {
      setErrorLocal(mensaje);
      return;
    }

    const cabecera = await leerCabecera(archivo);
    if (cabecera && tipoPorCabecera(cabecera) !== archivo.type) {
      setErrorLocal("Formato no válido. Subí una imagen (JPG, PNG) o un PDF.");
      return;
    }

    onElegirDocumento?.(tipo, archivo);
  }

  const documentos: DefinicionDocumento[] = [
    {
      tipo: "dni_frente",
      titulo: "DNI, frente",
      subtituloPendiente: "Foto o PDF del frente",
      camara: true,
    },
    {
      tipo: "dni_dorso",
      titulo: "DNI, dorso",
      subtituloPendiente: "Foto o PDF del dorso",
      camara: true,
    },
    {
      tipo: "antecedentes",
      titulo: "Certificado de antecedentes",
      subtituloPendiente: "Emitido en los últimos 90 días",
      camara: false,
    },
    ...(tieneGas
      ? [
          {
            tipo: "matricula" as const,
            titulo: "Matrícula de gasista",
            subtituloPendiente: "Porque elegiste gas",
            camara: true,
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Documentos de verificación" className="flex flex-col gap-2.5">
      {documentos.map((doc) => {
        const local = documentosLocales[doc.tipo];
        const remota = verifPorTipo[doc.tipo];
        const enRevisionRemota = remota?.estado === "pendiente" || Boolean(subidosAhora[doc.tipo]);
        const aprobado = remota?.estado === "aprobado";
        const rechazado = remota?.estado === "rechazado" && !local && !subidosAhora[doc.tipo];
        const listo = Boolean(local) || enRevisionRemota || aprobado;

        let detalle: ReactNode;
        if (local) {
          detalle = (
            <span className="truncate text-sm font-bold text-accion">Subido · {local.name}</span>
          );
        } else if (aprobado) {
          detalle = <span className="text-sm font-bold text-accion">Aprobado</span>;
        } else if (enRevisionRemota) {
          detalle = <span className="text-sm font-bold text-accion">Subido · en revisión</span>;
        } else if (rechazado) {
          detalle = (
            <span className="text-sm font-bold text-error">
              Rechazado{remota.motivoRechazo ? `: ${remota.motivoRechazo}` : ""}. Volvé a subirlo.
            </span>
          );
        } else {
          detalle = <span className="text-sm text-texto">{doc.subtituloPendiente}</span>;
        }

        return (
          <FilaDocumento
            key={doc.tipo}
            id={`${base}-${doc.tipo}`}
            titulo={doc.titulo}
            detalle={detalle}
            listo={listo}
            tieneArchivoLocal={Boolean(local)}
            camara={doc.camara}
            ocupado={ocupado || sinConsentimiento}
            describedBy={describedBy}
            onSeleccionar={(arch) => void manejarArchivo(doc.tipo, arch)}
            onQuitar={() => onQuitarDocumento?.(doc.tipo)}
          />
        );
      })}

      <p className="mt-0.5 text-sm leading-[1.4] text-texto">
        Lo sacás online en el{" "}
        <a
          href={URL_REINCIDENCIA}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-texto underline decoration-2 underline-offset-4"
        >
          Registro Nacional de Reincidencia
        </a>
        .
      </p>

      <p className="text-sm leading-[1.4] text-texto">
        Foto o PDF, hasta 8 MB cada uno. Una vez subidos, ni vos podés volver a verlos: quedan
        guardados en privado.
      </p>

      {sinConsentimiento ? (
        <p className="text-sm font-bold text-texto">
          Marcá el consentimiento de abajo para habilitar la carga.
        </p>
      ) : null}

      <div className="mt-1">
        <ConsentimientoDatosSensibles
          tildada={consentimiento.tildado}
          onCambio={consentimiento.onCambio}
        />
      </div>

      {progreso ? (
        <div role="status" className="flex flex-col gap-1.5 text-sm font-bold text-texto">
          <span>
            Subiendo documentos… {progreso.hechos} de {progreso.total}
          </span>
          <progress
            value={progreso.hechos}
            max={progreso.total}
            aria-label="Avance de la subida"
            className="h-2 w-full overflow-hidden rounded-full accent-accion"
          />
        </div>
      ) : null}

      {errorLocal || error ? (
        <p id={idError} role="alert" className="text-[15px] font-bold text-error">
          {errorLocal || error}
        </p>
      ) : null}
    </section>
  );
}

function FilaDocumento({
  id,
  titulo,
  detalle,
  listo,
  tieneArchivoLocal,
  camara,
  ocupado,
  describedBy,
  onSeleccionar,
  onQuitar,
}: {
  id: string;
  titulo: string;
  detalle: ReactNode;
  listo: boolean;
  tieneArchivoLocal: boolean;
  camara: boolean;
  ocupado: boolean;
  describedBy?: string;
  onSeleccionar: (archivo: File) => void;
  onQuitar: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[20px] px-3.5 py-3",
        listo ? "bg-superficie" : "border-[3px] border-dashed border-texto",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[17px] font-bold text-texto">{titulo}</span>
        {detalle}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {tieneArchivoLocal ? (
          <button
            type="button"
            onClick={onQuitar}
            aria-label={`Quitar archivo de ${titulo}`}
            className="flex size-11 items-center justify-center rounded-full text-texto hover:bg-fondo"
          >
            <X aria-hidden strokeWidth={2.5} className="size-5" />
          </button>
        ) : null}

        <label
          htmlFor={id}
          className={cn(
            "inline-flex min-h-11 items-center justify-center rounded-[14px] text-[15px] font-bold transition-opacity has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco",
            listo
              ? "border-2 border-texto bg-transparent px-3.5 text-texto hover:bg-fondo"
              : "bg-texto px-4 text-fondo hover:opacity-90",
            ocupado ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          )}
        >
          <span>{listo ? "Cambiar" : "Subir"}</span>
          <span className="sr-only"> {titulo}</span>
          <input
            id={id}
            type="file"
            accept={ACEPTADOS}
            capture={camara ? "environment" : undefined}
            disabled={ocupado}
            aria-describedby={describedBy}
            className="sr-only"
            onChange={(e) => {
              const arch = e.target.files?.[0];
              e.target.value = "";
              if (arch) onSeleccionar(arch);
            }}
          />
        </label>
      </div>
    </div>
  );
}
