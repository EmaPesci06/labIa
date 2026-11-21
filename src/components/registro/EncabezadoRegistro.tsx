import { cn } from "@/lib/cn";

const PASOS = ["1 · Perfil", "2 · Documentos", "3 · Normas"] as const;

type Props = {
  paso: 1 | 2 | 3;
  titulo: string;
  descripcion: string;
  /** "formulario" (560 px) para perfil/documentos; "lectura" (720 px) para normas. */
  ancho?: "formulario" | "lectura";
  /** En normas el título móvil es 30 px para que entre en dos líneas sin cortar. */
  tituloChico?: boolean;
};

/**
 * Encabezado amarillo (`destacado`) de los tres pasos del registro profesional (`App-ProPerfil`,
 * `App-ProDocumentos` y `App-ProNormas`). Ocupa todo el ancho y alinea el contenido con la columna
 * centrada de la pantalla.
 */
export function EncabezadoRegistro({
  paso,
  titulo,
  descripcion,
  ancho = "formulario",
  tituloChico = false,
}: Props) {
  return (
    <header
      data-encabezado="destacado"
      className="w-full rounded-b-hoja bg-destacado px-5 py-4 text-sobre-destacado lg:rounded-b-[40px] lg:px-8 lg:pt-6 lg:pb-7"
    >
      <div
        className={cn(
          "mx-auto flex w-full flex-col",
          ancho === "lectura" ? "max-w-[720px]" : "max-w-[560px]",
        )}
      >
        <div role="group" aria-label={`Paso ${paso} de ${PASOS.length}`}>
          <ol
            aria-label="Pasos del registro"
            className="grid grid-cols-3 gap-1.5 text-sm font-bold"
          >
            {PASOS.map((etiqueta, indice) => {
              const numero = indice + 1;
              const activo = numero === paso;
              const cumplido = numero <= paso;
              return (
                <li
                  key={etiqueta}
                  aria-current={activo ? "step" : undefined}
                  className={cn(
                    "border-t-[6px] pt-1.5",
                    cumplido ? "border-sobre-destacado" : "border-superficie",
                  )}
                >
                  {etiqueta}
                </li>
              );
            })}
          </ol>
        </div>
        <h1
          className={cn(
            "mt-3 font-titulo font-extrabold lg:text-[48px] lg:leading-none",
            tituloChico ? "text-[30px] leading-[1.02]" : "text-[34px] leading-none",
          )}
        >
          {titulo}
        </h1>
        <p className="mt-1.5 text-base leading-[1.35]">{descripcion}</p>
      </div>
    </header>
  );
}
