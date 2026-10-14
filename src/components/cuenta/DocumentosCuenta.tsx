"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BloqueVerificacion } from "@/components/registro/BloqueVerificacion";
import { Boton } from "@/components/ui/Boton";
import { registrarEvento } from "@/lib/metricas";
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
    const resultado = await subirDocumentos(uid, entradas, (hechos, total) =>
      setProgreso({ hechos, total }),
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
    <div className="flex max-w-xl flex-col gap-4">
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
        variante="profesional"
        tamano="grande"
        bloque
        cargando={enviando}
        disabled={entradas.length === 0 || !consentido}
        onClick={() => void enviar()}
      >
        Enviar documentos
      </Boton>
    </div>
  );
}
