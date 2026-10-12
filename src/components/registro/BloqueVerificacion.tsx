"use client";

import { Check, ChevronDown, ChevronUp, FileText, ShieldCheck, Upload, X } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/cn";
import type { ItemVerificacion } from "@/lib/registro/tipos";
import {
  MAX_BYTES_DOCUMENTO,
  MIMES_DOCUMENTO_ACEPTADOS,
  type TipoDocumento,
} from "@/lib/validaciones/documentos";

const ACEPTADOS = ".jpg,.jpeg,.png,.pdf," + MIMES_DOCUMENTO_ACEPTADOS.join(",");

type Props = {
  className?: string;
  tieneGas?: boolean;
  verificaciones?: ItemVerificacion[];
  documentosLocales?: Partial<Record<TipoDocumento, File | null>>;
  onElegirDocumento?: (tipo: TipoDocumento, archivo: File) => void;
  onQuitarDocumento?: (tipo: TipoDocumento) => void;
  ocupado?: boolean;
  error?: string | null;
};

export function BloqueVerificacion({
  className,
  tieneGas = false,
  verificaciones = [],
  documentosLocales = {},
  onElegirDocumento,
  onQuitarDocumento,
  ocupado = false,
  error,
}: Props) {
  const [expandirDni, setExpandirDni] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const idError = useId();

  // Mapear la última verificación de cada tipo
  const verifPorTipo = verificaciones.reduce<Partial<Record<TipoDocumento, ItemVerificacion>>>(
    (acc, v) => {
      if (!acc[v.tipo]) acc[v.tipo] = v;
      return acc;
    },
    {},
  );

  function manejarArchivo(tipo: TipoDocumento, archivo: File | undefined) {
    if (!archivo) return;
    setErrorLocal(null);

    if (archivo.size > MAX_BYTES_DOCUMENTO) {
      setErrorLocal("El archivo no puede superar los 8 MB.");
      return;
    }

    const esValido =
      MIMES_DOCUMENTO_ACEPTADOS.includes(
        archivo.type as (typeof MIMES_DOCUMENTO_ACEPTADOS)[number],
      ) || /\.(jpg|jpeg|png|pdf)$/i.test(archivo.name);

    if (!esValido) {
      setErrorLocal("Formato no válido. Subí una imagen (JPG, PNG) o un PDF.");
      return;
    }

    onElegirDocumento?.(tipo, archivo);
  }

  // Estado del DNI conjunto
  const dniFrenteListo = Boolean(documentosLocales.dni_frente || verifPorTipo.dni_frente);
  const dniDorsoListo = Boolean(documentosLocales.dni_dorso || verifPorTipo.dni_dorso);
  const cantidadDni = (dniFrenteListo ? 1 : 0) + (dniDorsoListo ? 1 : 0);

  function renderizarEstado(tipo: TipoDocumento, etiquetaVacia: string) {
    const local = documentosLocales[tipo];
    const remota = verifPorTipo[tipo];

    if (local) {
      return (
        <span className="flex items-center gap-1.5 font-bold text-azul">
          <Check aria-hidden className="size-4 text-exito" />
          <span className="max-w-[120px] truncate text-xs sm:max-w-[160px]">{local.name}</span>
        </span>
      );
    }

    if (remota) {
      if (remota.estado === "aprobado") {
        return (
          <span className="flex items-center gap-1 font-bold text-exito">
            <Check aria-hidden className="size-4" /> Verificado
          </span>
        );
      }
      if (remota.estado === "pendiente") {
        return <span className="font-semibold text-texto-secundario">En revisión</span>;
      }
      if (remota.estado === "rechazado") {
        return <span className="font-semibold text-error">Rechazado (subir de nuevo)</span>;
      }
    }

    return <span className="font-bold text-sobre-azul-suave">{etiquetaVacia}</span>;
  }

  return (
    <section
      aria-labelledby="verificacion-titulo"
      className={cn(
        "flex flex-col gap-3 rounded-tarjeta bg-azul-suave p-4 lg:rounded-[20px] lg:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2
          id="verificacion-titulo"
          className="flex items-center gap-2 text-base font-bold text-sobre-azul-suave lg:text-[17px]"
        >
          <ShieldCheck aria-hidden strokeWidth={2} className="size-5" />
          Verificación obligatoria
        </h2>
        <p className="text-sm leading-snug text-texto">
          La revisamos a mano. No se muestra en tu perfil: solo aparecen las insignias.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* DNI: Selector con acordeón de frente y dorso */}
        <div className="flex flex-col overflow-hidden rounded-campo border border-borde bg-superficie">
          <button
            type="button"
            onClick={() => setExpandirDni((prev) => !prev)}
            aria-expanded={expandirDni}
            className="flex min-h-[52px] w-full items-center justify-between px-3.5 text-left text-[15px] font-semibold text-texto hover:bg-azul-suave/40 focus-visible:outline-[3px] focus-visible:outline-offset-[-2px] focus-visible:outline-foco"
          >
            <span className="flex items-center gap-2">
              DNI, frente y dorso
              {cantidadDni > 0 ? (
                <span className="rounded-full bg-azul-suave px-2 py-0.5 text-xs font-bold text-sobre-azul-suave">
                  {cantidadDni}/2
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-2">
              {cantidadDni === 2 ? (
                <span className="flex items-center gap-1 font-bold text-exito">
                  <Check aria-hidden className="size-4" /> Listo
                </span>
              ) : (
                <span className="font-bold text-sobre-azul-suave">Subir</span>
              )}
              {expandirDni ? (
                <ChevronUp aria-hidden className="size-4 text-texto-secundario" />
              ) : (
                <ChevronDown aria-hidden className="size-4 text-texto-secundario" />
              )}
            </span>
          </button>

          {expandirDni ? (
            <div className="flex flex-col gap-2 border-t border-borde bg-fondo p-3">
              <FilaArchivo
                id="doc-dni-frente"
                etiqueta="Frente del DNI"
                estadoTexto={renderizarEstado("dni_frente", "Subir foto o PDF")}
                tieneArchivo={Boolean(documentosLocales.dni_frente)}
                ocupado={ocupado}
                onSeleccionar={(arch) => manejarArchivo("dni_frente", arch)}
                onQuitar={() => onQuitarDocumento?.("dni_frente")}
              />
              <FilaArchivo
                id="doc-dni-dorso"
                etiqueta="Dorso del DNI"
                estadoTexto={renderizarEstado("dni_dorso", "Subir foto o PDF")}
                tieneArchivo={Boolean(documentosLocales.dni_dorso)}
                ocupado={ocupado}
                onSeleccionar={(arch) => manejarArchivo("dni_dorso", arch)}
                onQuitar={() => onQuitarDocumento?.("dni_dorso")}
              />
            </div>
          ) : null}
        </div>

        {/* Certificado de antecedentes */}
        <FilaArchivo
          id="doc-antecedentes"
          etiqueta="Certificado de antecedentes"
          estadoTexto={renderizarEstado("antecedentes", "Subir PDF")}
          tieneArchivo={Boolean(documentosLocales.antecedentes)}
          ocupado={ocupado}
          envolturaBoton
          onSeleccionar={(arch) => manejarArchivo("antecedentes", arch)}
          onQuitar={() => onQuitarDocumento?.("antecedentes")}
        />

        {/* Matrícula (solo si tiene gas) */}
        {tieneGas ? (
          <FilaArchivo
            id="doc-matricula"
            etiqueta="Constancia de matrícula"
            estadoTexto={renderizarEstado("matricula", "Subir PDF o foto")}
            tieneArchivo={Boolean(documentosLocales.matricula)}
            ocupado={ocupado}
            envolturaBoton
            onSeleccionar={(arch) => manejarArchivo("matricula", arch)}
            onQuitar={() => onQuitarDocumento?.("matricula")}
          />
        ) : null}
      </div>

      {errorLocal || error ? (
        <p id={idError} role="alert" className="text-sm font-semibold text-error">
          {errorLocal || error}
        </p>
      ) : null}
    </section>
  );
}

function FilaArchivo({
  id,
  etiqueta,
  estadoTexto,
  tieneArchivo,
  ocupado,
  envolturaBoton = false,
  onSeleccionar,
  onQuitar,
}: {
  id: string;
  etiqueta: string;
  estadoTexto: React.ReactNode;
  tieneArchivo: boolean;
  ocupado: boolean;
  envolturaBoton?: boolean;
  onSeleccionar: (archivo: File) => void;
  onQuitar: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[52px] items-center justify-between rounded-campo border border-borde bg-superficie px-3.5",
        envolturaBoton && "hover:bg-azul-suave/40",
      )}
    >
      <label
        htmlFor={id}
        className="flex flex-1 cursor-pointer items-center justify-between gap-2 py-3 text-[15px] font-semibold text-texto focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-foco"
      >
        <span className="flex items-center gap-2">
          <FileText aria-hidden className="size-4.5 text-azul" />
          {etiqueta}
        </span>
        <div className="flex items-center gap-2">
          {estadoTexto}
          {!tieneArchivo ? <Upload aria-hidden className="size-4 text-azul" /> : null}
        </div>
        <input
          id={id}
          type="file"
          accept={ACEPTADOS}
          disabled={ocupado}
          className="sr-only"
          onChange={(e) => {
            const arch = e.target.files?.[0];
            e.target.value = "";
            if (arch) onSeleccionar(arch);
          }}
        />
      </label>
      {tieneArchivo ? (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar archivo de ${etiqueta}`}
          className="ml-2 flex size-8 items-center justify-center rounded-full text-texto-secundario hover:bg-divisor hover:text-texto"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
