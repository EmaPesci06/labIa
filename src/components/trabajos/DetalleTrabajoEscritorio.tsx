import Image from "next/image";
import { Check } from "lucide-react";

import { Boton } from "@/components/ui/Boton";
import { CintaDistancia } from "@/components/ui/cinta-metrica";
import { EtiquetaMono } from "@/components/ui/EtiquetaMono";
import { Insignia } from "@/components/ui/Insignia";
import { haceCuanto } from "@/lib/formato";
import type { TrabajoParaMi } from "@/lib/trabajos/consulta";
import { ETIQUETA_OFICIO, ETIQUETA_URGENCIA } from "@/lib/validaciones/trabajo";

type DetalleTrabajoEscritorioProps = {
  trabajo: TrabajoParaMi | null;
};

/**
 * Detalle del trabajo seleccionado en vista de escritorio (maestro-detalle de LAB-27).
 * Si no hay trabajo seleccionado, muestra "Elegí un trabajo para ver el detalle."
 */
export function DetalleTrabajoEscritorio({ trabajo }: DetalleTrabajoEscritorioProps) {
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {trabajo.fotos.map((foto, idx) => (
            <div
              key={foto}
              className="relative aspect-4/3 overflow-hidden rounded-xl border border-divisor bg-superficie-elevada"
            >
              <Image
                src={foto}
                alt={`Foto ${idx + 1} del trabajo`}
                fill
                sizes="(max-width: 1024px) 50vw, 200px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
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
          {trabajo.cantidadPostulaciones === 0
            ? "Sin postulantes"
            : trabajo.cantidadPostulaciones === 1
              ? "1 postulante"
              : `${trabajo.cantidadPostulaciones} postulantes`}
        </span>
      </div>

      <div className="mt-2 border-t border-divisor pt-4">
        {trabajo.yaMePostule ? (
          <div className="flex items-center gap-2.5 rounded-[14px] bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave">
            <Check aria-hidden className="size-5 shrink-0" />
            Postulación enviada. Si te elige, el cliente te escribe por WhatsApp.
          </div>
        ) : (
          <Boton
            href={`/trabajos/${trabajo.id}`}
            variante="profesional"
            className="w-full sm:w-auto"
          >
            Ver detalle y postularme
          </Boton>
        )}
      </div>
    </section>
  );
}
