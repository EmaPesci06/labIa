"use client";

import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import {
  cerrarTrabajoAccion,
  marcarEnRevisionAccion,
  ocultarResenaAccion,
  reactivarCuentaAccion,
  resolverReporteAccion,
} from "@/lib/admin/reportes-acciones";

type AccionTipo =
  | { tipo: "marcar_en_revision"; reporteId: string }
  | { tipo: "resolver"; reporteId: string; resolucion: "accion_tomada" | "desestimado" }
  | { tipo: "cerrar_trabajo"; trabajoId: string }
  | { tipo: "ocultar_resena"; resenaId: string }
  | { tipo: "reactivar_cuenta"; usuarioId: string };

type Props = {
  accion: AccionTipo;
  etiqueta: string;
  variante?: "cliente" | "secundario" | "fantasma";
  className?: string;
};

export function BotonAccionModeracion({
  accion,
  etiqueta,
  variante = "secundario",
  className,
}: Props) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ejecutar = () => {
    setError(null);
    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      switch (accion.tipo) {
        case "marcar_en_revision":
          res = await marcarEnRevisionAccion(accion.reporteId);
          break;
        case "resolver":
          res = await resolverReporteAccion(accion.reporteId, accion.resolucion);
          break;
        case "cerrar_trabajo":
          res = await cerrarTrabajoAccion(accion.trabajoId);
          break;
        case "ocultar_resena":
          res = await ocultarResenaAccion(accion.resenaId);
          break;
        case "reactivar_cuenta":
          res = await reactivarCuentaAccion(accion.usuarioId);
          break;
      }
      if (!res.ok) {
        setError(res.error || "Ocurrió un error.");
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Boton
        type="button"
        variante={variante}
        cargando={pendiente}
        onClick={ejecutar}
        className={className}
      >
        {etiqueta}
      </Boton>
      {error ? (
        <span role="alert" className="text-xs font-semibold text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
