"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BloqueVerificacion } from "@/components/registro/BloqueVerificacion";
import { Boton } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { registrarEvento } from "@/lib/metricas";
import { faltaAprobarDocumentos } from "@/lib/registro/documentos-estado";
import { subirDocumentos } from "@/lib/registro/subir-documentos";
import type { ItemVerificacion } from "@/lib/registro/tipos";
import type { TipoDocumento } from "@/lib/validaciones/documentos";

type Props = {
  uid: string;
  tieneGas: boolean;
  verificaciones: ItemVerificacion[];
};

/** /cuenta/verificacion: volver a subir documentos (por ejemplo, uno que fue rechazado). */
export function DocumentosCuenta({ uid, tieneGas, verificaciones }: Props) {
  const router = useRouter();
  const [locales, setLocales] = useState<Partial<Record<TipoDocumento, File | null>>>({});
  const [subidosAhora, setSubidosAhora] = useState<Partial<Record<TipoDocumento, boolean>>>({});
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [consentido, setConsentido] = useState(false);

  const entradas = (Object.entries(locales) as [TipoDocumento, File | null][]).filter(
    (entrada): entrada is [TipoDocumento, File] => Boolean(entrada[1]),
  );

  async function enviar() {
    setError(null);
    setEnviando(true);
    // `subirDocumentos` no sube sin la casilla tildada y registra el consentimiento antes del primer archivo.
    const resultado = await subirDocumentos(
      uid,
      entradas,
      (hechos, total) => setProgreso({ hechos, total }),
      consentido,
    );
    setProgreso(null);
    setEnviando(false);
    if (resultado.subidos.length > 0) {
      setSubidosAhora((previos) => ({
        ...previos,
        ...Object.fromEntries(resultado.subidos.map((tipo) => [tipo, true])),
      }));
      setLocales((previos) => ({
        ...previos,
        ...Object.fromEntries(resultado.subidos.map((tipo) => [tipo, null])),
      }));
    }
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    registrarEvento("documentos_enviados");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <BloqueVerificacion
        tieneGas={tieneGas}
        verificaciones={verificaciones}
        documentosLocales={locales}
        onElegirDocumento={(tipo, archivo) => setLocales((prev) => ({ ...prev, [tipo]: archivo }))}
        onQuitarDocumento={(tipo) => setLocales((prev) => ({ ...prev, [tipo]: null }))}
        subidosAhora={subidosAhora}
        progreso={progreso}
        ocupado={enviando}
        error={error}
        consentimiento={{ tildado: consentido, onCambio: setConsentido }}
      />
      <Boton
        tamano="grande"
        bloque
        cargando={enviando}
        disabled={entradas.length === 0 || !consentido}
        onClick={() => void enviar()}
      >
        Enviar documentos
      </Boton>
      {faltaAprobarDocumentos(verificaciones, tieneGas) ? (
        <Tarjeta
          como="section"
          aria-labelledby="mientras-tanto"
          className="mt-1 flex flex-col gap-1"
        >
          <h2 id="mientras-tanto" className="font-titulo text-xl leading-tight">
            Mientras tanto
          </h2>
          <p className="text-[15px] leading-snug text-texto">
            Tu perfil no aparece en las búsquedas y no podés postularte. Apenas aprobemos lo que
            falta, se publica solo y te avisamos por email.
          </p>
        </Tarjeta>
      ) : null}
      <p className="text-sm leading-snug text-texto">
        Los archivos ya subidos no se pueden volver a ver ni descargar, ni siquiera desde tu cuenta.
      </p>
    </div>
  );
}
