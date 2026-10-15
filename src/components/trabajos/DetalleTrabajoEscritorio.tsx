import { textoPostulantes } from "@/components/TarjetaTrabajo";
import { CintaDistancia } from "@/components/ui/cinta-metrica";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Insignia } from "@/components/ui/Insignia";
import { formatearPesos, haceCuanto } from "@/lib/formato";
import type { TrabajoParaMi } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

import { FormularioPostulacion, type MiPostulacionInfo } from "./FormularioPostulacion";
import { GaleriaFotosTrabajo } from "./GaleriaFotosTrabajo";

type DetalleTrabajoEscritorioProps = {
  trabajo: TrabajoParaMi | null;
  /** Postulación propia de este trabajo (la página la carga para el trabajo seleccionado). */
  miPostulacion?: MiPostulacionInfo | null;
  publicado?: boolean;
};

/**
 * Detalle del trabajo seleccionado en vista de escritorio (maestro-detalle de LAB-27 y LAB-28).
 * Coincide con Desk-Trabajos.dc.html: datos del trabajo, fotos, y la postulación propia o el
 * formulario para postularse. El formulario tiene `key` por trabajo: al cambiar de trabajo se
 * monta de nuevo y no arrastra mensajes ni valores del anterior.
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
        className="flex min-h-[380px] flex-1 items-center justify-center rounded-[22px] border border-divisor bg-superficie p-8 text-center text-[17px] text-texto-secundario"
      >
        Elegí un trabajo para ver el detalle.
      </section>
    );
  }

  const cuando = haceCuanto(trabajo.createdAt);
  const clienteNombreVisible = trabajo.clienteNombre
    ? `${trabajo.clienteNombre}${trabajo.clienteApellidoInicial ? ` ${trabajo.clienteApellidoInicial}.` : ""}`
    : "Cliente de LabÍA";
  const clienteNombreParaFormulario = trabajo.clienteNombre ?? "el cliente";

  return (
    <section
      aria-label={`Detalle: ${trabajo.titulo}`}
      className="flex flex-1 flex-col gap-5 rounded-[22px] border border-divisor bg-superficie p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EtiquetaMono partes={[ETIQUETA_OFICIO[trabajo.oficio], trabajo.barrioNombre]} />
        <span className="text-sm text-texto-secundario">{cuando}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-titulo text-2xl font-extrabold tracking-tight text-texto lg:text-[28px]">
          {trabajo.titulo}
        </h2>
        {trabajo.distanciaKm !== null ? <CintaDistancia km={trabajo.distanciaKm} /> : null}
      </div>

      <p className="text-[17px] leading-relaxed whitespace-pre-line text-texto">
        {trabajo.descripcion}
      </p>

      {trabajo.fotos.length > 0 ? (
        <GaleriaFotosTrabajo fotos={trabajo.fotos} tituloTrabajo={trabajo.titulo} />
      ) : null}

      {trabajo.presupuestoEstimado !== null ? (
        <p className="text-sm font-semibold text-texto-secundario">
          El cliente estima {formatearPesos(trabajo.presupuestoEstimado)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-texto-secundario">
        <span className="font-medium text-texto">Cliente: {clienteNombreVisible}</span>
        <span>·</span>
        <span>La dirección se comparte al acordar</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Insignia variante={trabajo.urgencia === "lo_antes_posible" ? "urgencia" : "verificada"}>
          {ETIQUETA_URGENCIA[trabajo.urgencia]}
        </Insignia>
        <span className="text-sm font-semibold text-texto-secundario">
          {textoPostulantes(trabajo.cantidadPostulaciones)}
        </span>
      </div>

      <div className="mt-2 border-t border-divisor pt-4">
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
