import Link from "next/link";
import { useId } from "react";

import { RUTA_PRIVACIDAD, VERSION_LEGALES } from "@/lib/legales";

/**
 * Casilla de consentimiento expreso para tratar DNI y certificado de antecedentes (LAB-35).
 * Va dentro del formulario de carga de documentos: manda `consiento` y `version`, que valida
 * `darConsentimientoDatosSensibles`. El botón de subir tiene que quedar deshabilitado hasta
 * que esté tildada: `BloqueVerificacion` la conecta (LAB-43).
 */
export function ConsentimientoDatosSensibles({
  tildada,
  onCambio,
  error,
}: {
  tildada: boolean;
  onCambio: (tildada: boolean) => void;
  error?: string | undefined;
}) {
  // El bloque de verificación se renderiza dos veces (celular y escritorio): el id tiene que ser único.
  const idError = `${useId()}-consentimiento`;
  return (
    <div className="flex flex-col gap-1.5">
      <input type="hidden" name="version" value={VERSION_LEGALES} />
      <label className="flex min-h-[52px] cursor-pointer items-start gap-3 rounded-[14px] border-[1.5px] border-borde bg-superficie px-3.5 py-3 text-[15px] leading-snug">
        <input
          type="checkbox"
          name="consiento"
          checked={tildada}
          onChange={(e) => onCambio(e.target.checked)}
          aria-describedby={error ? idError : undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-[22px] flex-none accent-azul"
        />
        <span>
          Acepto que LabÍA trate mi DNI y mi certificado de antecedentes solo para verificar mi
          identidad, según la{" "}
          <Link
            href={RUTA_PRIVACIDAD}
            target="_blank"
            prefetch={false}
            className="font-bold text-azul underline underline-offset-2"
          >
            Política de privacidad
          </Link>
          .
        </span>
      </label>
      <p id={idError} role="alert" className="text-sm font-semibold text-error empty:hidden">
        {error}
      </p>
    </div>
  );
}
