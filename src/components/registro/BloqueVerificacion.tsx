"use client";

import { Check, ChevronDown, ChevronUp, FileText, ShieldCheck, Upload, X } from "lucide-react";
import { useId, useState } from "react";

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
  className?: string;
  tieneGas?: boolean;
  verificaciones?: ItemVerificacion[];
  documentosLocales?: Partial<Record<TipoDocumento, File | null>>;
  onElegirDocumento?: (tipo: TipoDocumento, archivo: File) => void;
  onQuitarDocumento?: (tipo: TipoDocumento) => void;
  /** Tipos que se subieron en esta sesión (todavía no figuran en `verificaciones`). */
  subidosAhora?: Partial<Record<TipoDocumento, boolean>>;
  /** Avance de la subida, si hay una en curso. */
  progreso?: { hechos: number; total: number } | null;
  ocupado?: boolean;
  error?: string | null;
  /**
   * Consentimiento expreso para tratar DNI y antecedentes (LAB-43). Con `consentimiento`, la casilla
   * se muestra y las entradas de archivo quedan deshabilitadas hasta que esté tildada.
   */
  consentimiento?: { tildado: boolean; onCambio: (tildado: boolean) => void };
};

export function BloqueVerificacion({
  className,
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
  const sinConsentimiento = consentimiento ? !consentimiento.tildado : false;
  const [expandirDni, setExpandirDni] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  // El bloque se renderiza dos veces (celular y escritorio): los id tienen que ser únicos.
  const base = useId();
  const idError = `${base}-error`;
  const describedBy = error || errorLocal ? idError : undefined;

  // La última verificación de cada tipo (vienen ordenadas de la más nueva a la más vieja).
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

    // Que el contenido coincida con el tipo declarado: no alcanza con el nombre.
    const cabecera = await leerCabecera(archivo);
    if (cabecera && tipoPorCabecera(cabecera) !== archivo.type) {
      setErrorLocal("Formato no válido. Subí una imagen (JPG, PNG) o un PDF.");
      return;
    }

    onElegirDocumento?.(tipo, archivo);
  }

  // Un documento cuenta como listo si está elegido, recién subido o ya registrado sin rechazo.
  const listo = (tipo: TipoDocumento) => {
    if (documentosLocales[tipo] || subidosAhora[tipo]) return true;
    const remota = verifPorTipo[tipo];
    return remota !== undefined && remota.estado !== "rechazado";
  };
  const cantidadDni = (listo("dni_frente") ? 1 : 0) + (listo("dni_dorso") ? 1 : 0);

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

    const enRevision = (
      <span className="font-semibold text-texto-secundario">Subido · en revisión</span>
    );
    if (subidosAhora[tipo]) return enRevision;

    if (remota) {
      if (remota.estado === "aprobado") {
        return (
          <span className="flex items-center gap-1 font-bold text-exito">
            <Check aria-hidden className="size-4" /> Aprobado
          </span>
        );
      }
      if (remota.estado === "pendiente") return enRevision;
      return (
        <span className="flex flex-col items-end text-right">
          <span className="text-xs font-semibold text-error">
            Rechazado{remota.motivoRechazo ? `: ${remota.motivoRechazo}` : ""}. Volvé a subirlo.
          </span>
          <span className="font-bold text-sobre-azul-suave">Volver a subir</span>
        </span>
      );
    }

    return (
      <span className="flex flex-col items-end text-right">
        <span className="text-xs font-semibold whitespace-nowrap text-texto-secundario">
          Falta subir
        </span>
        <span className="font-bold whitespace-nowrap text-sobre-azul-suave">{etiquetaVacia}</span>
      </span>
    );
  }

  return (
    <section
      aria-labelledby={`${base}-titulo`}
      className={cn(
        "flex flex-col gap-3 rounded-tarjeta bg-azul-suave p-4 lg:rounded-[20px] lg:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={`${base}-titulo`}
          className="flex items-center gap-2 text-base font-bold text-sobre-azul-suave lg:text-[17px]"
        >
          <ShieldCheck aria-hidden strokeWidth={2} className="size-5" />
          Verificación obligatoria
        </h2>
        <p className="text-sm leading-snug text-texto">
          La revisamos a mano. No se muestra en tu perfil: solo aparecen las insignias.
        </p>
      </div>

      {consentimiento ? (
        <ConsentimientoDatosSensibles
          tildada={consentimiento.tildado}
          onCambio={consentimiento.onCambio}
        />
      ) : null}

      <div className="flex flex-col gap-2.5">
        {/* DNI: acordeón con frente y dorso */}
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
                id={`${base}-dni-frente`}
                etiqueta="Frente del DNI"
                estadoTexto={renderizarEstado("dni_frente", "Subir foto o PDF")}
                tieneArchivo={Boolean(documentosLocales.dni_frente)}
                camara
                ocupado={ocupado || sinConsentimiento}
                describedBy={describedBy}
                onSeleccionar={(arch) => void manejarArchivo("dni_frente", arch)}
                onQuitar={() => onQuitarDocumento?.("dni_frente")}
              />
              <FilaArchivo
                id={`${base}-dni-dorso`}
                etiqueta="Dorso del DNI"
                estadoTexto={renderizarEstado("dni_dorso", "Subir foto o PDF")}
                tieneArchivo={Boolean(documentosLocales.dni_dorso)}
                camara
                ocupado={ocupado || sinConsentimiento}
                describedBy={describedBy}
                onSeleccionar={(arch) => void manejarArchivo("dni_dorso", arch)}
                onQuitar={() => onQuitarDocumento?.("dni_dorso")}
              />
            </div>
          ) : null}
        </div>

        {/* Antecedentes: PDF o foto. Sin `capture`, para que el celular deje elegir el PDF. */}
        <FilaArchivo
          id={`${base}-antecedentes`}
          etiqueta="Certificado de antecedentes"
          estadoTexto={renderizarEstado("antecedentes", "Subir PDF")}
          tieneArchivo={Boolean(documentosLocales.antecedentes)}
          ocupado={ocupado || sinConsentimiento}
          describedBy={describedBy}
          envolturaBoton
          onSeleccionar={(arch) => void manejarArchivo("antecedentes", arch)}
          onQuitar={() => onQuitarDocumento?.("antecedentes")}
        />
        <p className="-mt-1 text-xs leading-snug text-texto-secundario">
          Lo sacás online en el sitio del{" "}
          <a
            href={URL_REINCIDENCIA}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-azul underline"
          >
            Registro Nacional de Reincidencia
          </a>
          . Tiene que tener menos de 90 días.
        </p>

        {/* Matrícula (solo si tiene gas) */}
        {tieneGas ? (
          <FilaArchivo
            id={`${base}-matricula`}
            etiqueta="Constancia de matrícula"
            estadoTexto={renderizarEstado("matricula", "Subir foto del carnet")}
            tieneArchivo={Boolean(documentosLocales.matricula)}
            camara
            ocupado={ocupado || sinConsentimiento}
            describedBy={describedBy}
            envolturaBoton
            onSeleccionar={(arch) => void manejarArchivo("matricula", arch)}
            onQuitar={() => onQuitarDocumento?.("matricula")}
          />
        ) : null}
      </div>

      {progreso ? (
        <div role="status" className="flex flex-col gap-1.5 text-sm text-texto">
          <span>
            Subiendo documentos… {progreso.hechos} de {progreso.total}
          </span>
          <progress
            value={progreso.hechos}
            max={progreso.total}
            aria-label="Avance de la subida"
            className="h-2 w-full overflow-hidden rounded-full accent-azul"
          />
        </div>
      ) : null}

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
  camara = false,
  describedBy,
  onSeleccionar,
  onQuitar,
}: {
  id: string;
  etiqueta: string;
  estadoTexto: React.ReactNode;
  tieneArchivo: boolean;
  ocupado: boolean;
  envolturaBoton?: boolean;
  /** Pide la cámara trasera en el celular. */
  camara?: boolean;
  describedBy?: string;
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
        <span className="flex min-w-0 items-center gap-2">
          <FileText aria-hidden className="size-4.5 shrink-0 text-azul" />
          {etiqueta}
        </span>
        {/* El estado no se parte: a 390 px la etiqueta es la que tiene que envolver (LAB-43). */}
        <div className="flex shrink-0 items-center gap-2">
          {estadoTexto}
          {!tieneArchivo ? <Upload aria-hidden className="size-4 shrink-0 text-azul" /> : null}
        </div>
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
      {tieneArchivo ? (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar archivo de ${etiqueta}`}
          className="-mr-3 ml-1 flex size-11 shrink-0 items-center justify-center rounded-full text-texto-secundario hover:bg-divisor hover:text-texto focus-visible:outline-[3px] focus-visible:outline-offset-[-2px] focus-visible:outline-foco"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
