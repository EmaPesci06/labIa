import { cn } from "@/lib/cn";

import { LOGO_ALTO, LOGO_ANCHO, TRAZO_OFICIO, TRAZO_SEGURO } from "./logo-trazos";

type Props = {
  /** "completo": insignia y nombre. "icono": solo la insignia (marcas chicas del admin y avisos). */
  variante?: "completo" | "icono";
  /** Texto alternativo. Pasá "" si el logo está al lado del nombre y es decorativo. */
  alt?: string;
  /** Dónde va el logo: el nombre en `texto` sobre fondo claro, blanco sobre el encabezado turquesa. */
  sobre?: "fondo" | "encabezado";
  className?: string;
};

const LLAVE =
  "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";

/** Las 12 ondas de la insignia, sobre un círculo de radio 37 alrededor del centro (50, 50). */
const ONDAS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + 37 * Math.cos(a), y: 50 + 37 * Math.sin(a) };
});

/** Insignia de verificado con la llave adentro, en una caja de 100 × 100. */
function Insignia() {
  return (
    <>
      <g className="fill-marca">
        <circle cx="50" cy="50" r="38" />
        {ONDAS.map((o, i) => (
          <circle key={i} cx={o.x.toFixed(2)} cy={o.y.toFixed(2)} r="9" />
        ))}
      </g>
      <path
        d={LLAVE}
        transform="translate(25 25) scale(2.1)"
        className="fill-sobre-marca stroke-sobre-marca"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  );
}

/**
 * Logo de Oficio Seguro: la insignia naranja con la llave y el nombre en Space Grotesk (convertido
 * en curvas, logo-trazos.ts). El nombre usa currentColor, así que sigue al tema; la insignia usa los
 * tokens `marca` y `sobre-marca`. Archivos para afuera de la app: docs/marca/.
 */
export function Logo({
  variante = "completo",
  alt = "Oficio Seguro",
  sobre = "fondo",
  className,
}: Props) {
  const accesibilidad =
    alt === "" ? { "aria-hidden": true } : { role: "img" as const, "aria-label": alt };

  if (variante === "icono") {
    return (
      <svg
        {...accesibilidad}
        viewBox="0 0 100 100"
        className={cn("inline-block size-10 shrink-0", className)}
      >
        <Insignia />
      </svg>
    );
  }

  return (
    <svg
      {...accesibilidad}
      viewBox={`0 0 ${LOGO_ANCHO} ${LOGO_ALTO}`}
      className={cn(
        // Alto en em: las clases text-* de quien lo usa (text-3xl, text-[32px]) siguen fijando el tamaño.
        "inline-block h-[1.4em] w-auto shrink-0 text-3xl",
        sobre === "encabezado" ? "text-sobre-encabezado" : "text-texto",
        className,
      )}
    >
      <g transform="translate(12 12)">
        <Insignia />
        <path d={TRAZO_OFICIO} fill="currentColor" />
        <path d={TRAZO_SEGURO} fill="currentColor" />
      </g>
    </svg>
  );
}
