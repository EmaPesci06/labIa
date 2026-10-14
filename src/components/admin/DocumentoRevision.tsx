import { Tarjeta } from "@/components/ui/Tarjeta";
import { haceCuanto } from "@/lib/formato";
import { ETIQUETAS_DOCUMENTO } from "@/lib/validaciones/documentos";
import type { DocumentoAdmin } from "@/lib/verificacion/logica";

import { FormularioDecision } from "./FormularioDecision";
import { VisorDocumento } from "./VisorDocumento";

const ESTILO_ESTADO = {
  pendiente: "bg-naranja-suave text-sobre-naranja-suave",
  aprobado: "bg-exito-suave text-sobre-exito-suave",
  rechazado: "bg-error/10 text-error",
} as const;

const TEXTO_ESTADO = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
} as const;

/**
 * Un documento para revisar: tipo, estado, visor (URL firmada al pedirla) y, si está pendiente,
 * aprobar o rechazar. Los documentos ya borrados por retención quedan como registro, sin visor.
 */
export function DocumentoRevision({ documento }: { documento: DocumentoAdmin }) {
  const etiqueta = ETIQUETAS_DOCUMENTO[documento.tipo];
  return (
    <Tarjeta borde className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-titulo text-lg font-extrabold">{etiqueta}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTILO_ESTADO[documento.estado]}`}
        >
          {TEXTO_ESTADO[documento.estado]}
        </span>
      </div>

      <p className="text-sm text-texto-secundario">
        Enviado {haceCuanto(documento.createdAt)}
        {documento.revisadoAt ? ` · revisado ${haceCuanto(documento.revisadoAt)}` : ""}
      </p>

      {documento.estado === "rechazado" && documento.motivoRechazo ? (
        <p className="rounded-[12px] bg-naranja-suave p-3 text-sm text-sobre-naranja-suave">
          Motivo: {documento.motivoRechazo}
        </p>
      ) : null}

      {documento.archivoBorrado ? (
        <p className="text-sm text-texto-secundario">
          El archivo se borró según la política de retención. Queda el registro de la decisión.
        </p>
      ) : (
        <>
          <VisorDocumento verificacionId={documento.id} etiqueta={etiqueta} />
          {documento.estado === "pendiente" ? (
            <FormularioDecision verificacionId={documento.id} />
          ) : null}
        </>
      )}
    </Tarjeta>
  );
}
