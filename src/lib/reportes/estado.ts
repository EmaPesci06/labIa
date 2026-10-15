import type { MotivoReporte } from "@/lib/validaciones/reportes";

export type EstadoReporteForm = {
  exito?: boolean;
  mensaje?: string;
  motivoEnviado?: MotivoReporte;
  errores?: Partial<Record<"motivo" | "detalle", string>>;
};

export const ESTADO_REPORTE_INICIAL: EstadoReporteForm = {};
