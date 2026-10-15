"use client";

import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { HojaInferior } from "@/components/ui/HojaInferior";
import { suspenderCuentaAccion } from "@/lib/admin/reportes-acciones";

type Props = {
  abierta: boolean;
  onCambioAbierta: (abierta: boolean) => void;
  usuarioId: string;
  nombreUsuario: string;
};

export function ModalSuspender({ abierta, onCambioAbierta, usuarioId, nombreUsuario }: Props) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const handleConfirmar = () => {
    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 3) {
      setError("Ingresá un motivo de al menos 3 caracteres.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await suspenderCuentaAccion(usuarioId, motivoLimpio);
      if (!res.ok) {
        setError(res.error || "No se pudo suspender la cuenta.");
      } else {
        setMotivo("");
        onCambioAbierta(false);
      }
    });
  };

  return (
    <HojaInferior
      abierta={abierta}
      onCambioAbierta={(ab) => {
        if (!pendiente) {
          setError(null);
          onCambioAbierta(ab);
        }
      }}
      titulo={`Suspender cuenta de ${nombreUsuario}`}
      descripcion="La cuenta no podrá operar en la plataforma. Sus trabajos abiertos se cancelarán y sus postulaciones serán retiradas."
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[14px] bg-naranja-suave p-3.5 text-sm text-sobre-naranja-suave">
          <p className="font-semibold">Esta acción:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>Cambia el estado de la cuenta a suspendida inmediatamente.</li>
            <li>Cancela sus trabajos abiertos o retira sus postulaciones activas.</li>
            <li>Le envía un correo explicando el motivo de la suspensión y contacto de soporte.</li>
          </ul>
        </div>

        <Campo
          variante="area"
          etiqueta="Motivo de la suspensión (obligatorio)"
          name="motivoSuspension"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Explicá claramente la infracción o motivo para que el usuario esté informado..."
          maxLength={500}
          required
          error={error ?? undefined}
        />
        <p className="-mt-2 text-xs text-texto-secundario">
          La persona suspendida ve este motivo. No incluyas datos personales de otras personas
          (nombres, teléfonos ni direcciones).
        </p>

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton
            type="button"
            variante="secundario"
            disabled={pendiente}
            onClick={() => onCambioAbierta(false)}
          >
            Cancelar
          </Boton>
          <button
            type="button"
            disabled={pendiente}
            onClick={handleConfirmar}
            className="inline-flex min-h-[44px] items-center justify-center rounded-boton bg-error px-5 text-sm font-bold text-sobre-azul hover:opacity-90 active:opacity-80 disabled:opacity-50"
          >
            {pendiente ? "Suspendiendo…" : "Confirmar suspensión"}
          </button>
        </div>
      </div>
    </HojaInferior>
  );
}
