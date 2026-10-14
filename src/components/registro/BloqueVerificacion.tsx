import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Bloque "Verificación obligatoria" del paso 1.
 * TODO(LAB-19): la carga privada de DNI, antecedentes y matrícula reemplaza los dos botones
 * deshabilitados de acá por el componente de documentos. El lugar y el texto quedan como están.
 */
export function BloqueVerificacion({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="verificacion-titulo"
      className={cn(
        "flex flex-col gap-2.5 rounded-tarjeta bg-azul-suave p-4 lg:rounded-[20px] lg:p-5",
        className,
      )}
    >
      <h2
        id="verificacion-titulo"
        className="flex items-center gap-2 text-base font-bold text-sobre-azul-suave lg:text-[17px]"
      >
        <ShieldCheck aria-hidden strokeWidth={2} className="size-5" />
        Verificación obligatoria
      </h2>
      <p className="text-sm leading-snug text-texto">
        La revisamos a mano. No se muestra en tu perfil: solo aparecen las insignias.
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          disabled
          className="flex min-h-[52px] items-center justify-between rounded-campo border border-borde bg-superficie px-3.5 text-[15px] font-semibold text-texto disabled:cursor-not-allowed disabled:opacity-60"
        >
          DNI, frente y dorso
          <span className="text-sobre-azul-suave">Subir</span>
        </button>
        <button
          type="button"
          disabled
          className="flex min-h-[52px] items-center justify-between rounded-campo border border-borde bg-superficie px-3.5 text-[15px] font-semibold text-texto disabled:cursor-not-allowed disabled:opacity-60"
        >
          Certificado de antecedentes
          <span className="text-sobre-azul-suave">Subir PDF</span>
        </button>
      </div>
    </section>
  );
}
