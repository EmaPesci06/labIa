import { textoPostulantes } from "@/components/TarjetaTrabajo";
import { formatearDistancia, formatearPesos, haceCuanto } from "@/lib/formato";
import type { TrabajoParaMi } from "@/lib/trabajos/consulta";
import {
  ETIQUETA_OFICIO,
  ETIQUETA_URGENCIA,
  type UrgenciaTrabajo,
} from "@/lib/validaciones/trabajo";

import { FormularioPostulacion, type MiPostulacionInfo } from "./FormularioPostulacion";
import { GaleriaFotosTrabajo } from "./GaleriaFotosTrabajo";

type DetalleTrabajoEscritorioProps = {
  trabajo: TrabajoParaMi | null;
  /** Postulación propia de este trabajo (la página la carga para el trabajo seleccionado). */
  miPostulacion?: MiPostulacionInfo | null;
  publicado?: boolean;
};

const ETIQUETA_PARA: Record<UrgenciaTrabajo, string> = {
  lo_antes_posible: "Hoy",
  esta_semana: "Esta semana",
  sin_apuro: "Sin apuro",
};

/**
 * Detalle del trabajo seleccionado en vista de escritorio (maestro-detalle de LAB-27, LAB-28 y LAB-78).
 * Datos del trabajo, fotos, y la postulación propia o el formulario para postularse.
 * El formulario tiene `key` por trabajo: al cambiar de trabajo se monta de nuevo y no arrastra
 * mensajes ni valores del anterior.
 */
export function DetalleTrabajoEscritorio({
  trabajo,
  miPostulacion = null,
  publicado = true,
}: DetalleTrabajoEscritorioProps) {
  if (!trabajo) {
    return (
      <section
        aria-label="Detalle del trabajo"
        className="flex min-h-[380px] flex-1 items-center justify-center rounded-3xl bg-superficie p-8 text-center text-[17px] text-texto"
      >
        Elegí un trabajo para ver el detalle.
      </section>
    );
  }

  const cuando = haceCuanto(trabajo.createdAt);
  const clienteNombreVisible = trabajo.clienteNombre
    ? `${trabajo.clienteNombre}${trabajo.clienteApellidoInicial ? ` ${trabajo.clienteApellidoInicial}.` : ""}`
    : "Cliente de Oficio Seguro";
  const clienteNombreParaFormulario = trabajo.clienteNombre ?? "el cliente";
  const distanciaNumero =
    trabajo.distanciaKm !== null
      ? formatearDistancia(trabajo.distanciaKm).replace(/^a /, "")
      : null;

  return (
    <section
      aria-label={`Detalle: ${trabajo.titulo}`}
      className="flex flex-1 flex-col gap-5 rounded-3xl bg-superficie p-7 text-texto"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[15px] text-texto">
          {ETIQUETA_OFICIO[trabajo.oficio]} · publicado {cuando}
        </p>
        <h2 className="font-titulo text-[28px] leading-tight text-texto">{trabajo.titulo}</h2>
      </div>

      <p className="text-[17px] leading-[1.45] whitespace-pre-line text-texto">
        {trabajo.descripcion}
      </p>

      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-fondo px-3 py-2.5">
          <dt className="text-sm text-texto">Barrio</dt>
          <dd className="font-bold text-texto">{trabajo.barrioNombre}</dd>
        </div>
        {distanciaNumero ? (
          <div className="rounded-xl bg-fondo px-3 py-2.5">
            <dt className="text-sm text-texto">Distancia</dt>
            <dd className="font-bold text-texto tabular-nums">{distanciaNumero}</dd>
          </div>
        ) : null}
        <div className="rounded-xl bg-fondo px-3 py-2.5">
          <dt className="text-sm text-texto">Para</dt>
          <dd aria-label={ETIQUETA_URGENCIA[trabajo.urgencia]} className="font-bold text-texto">
            {ETIQUETA_PARA[trabajo.urgencia]}
          </dd>
        </div>
      </dl>

      {trabajo.fotos.length > 0 ? (
        <GaleriaFotosTrabajo fotos={trabajo.fotos} tituloTrabajo={trabajo.titulo} />
      ) : null}

      {trabajo.presupuestoEstimado !== null ? (
        <p className="text-sm font-bold text-texto">
          El cliente estima {formatearPesos(trabajo.presupuestoEstimado)}
        </p>
      ) : null}

      <p className="text-[15px] text-texto">
        Lo publicó <strong>{clienteNombreVisible}</strong> ·{" "}
        <span>{textoPostulantes(trabajo.cantidadPostulaciones)}</span> · La dirección se comparte al
        acordar.
      </p>

      <div className="mt-1 border-t border-fondo pt-4">
        <FormularioPostulacion
          key={trabajo.id}
          trabajoId={trabajo.id}
          clienteNombre={clienteNombreParaFormulario}
          trabajoEstado="abierto"
          publicado={publicado}
          miPostulacion={miPostulacion}
        />
      </div>
    </section>
  );
}
