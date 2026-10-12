import { formatearDistancia } from "@/lib/formato";
import { cn } from "@/lib/cn";

/** Píxeles de cinta por kilómetro (guía §5). */
export const PX_POR_KM = 30;
export const CINTA_MIN_PX = 12;
export const CINTA_MAX_PX = 120;

/** Largo de la cinta de distancia: `clamp(12px, km * 30px, 120px)`. */
export function largoCinta(km: number): number {
  if (!Number.isFinite(km)) return CINTA_MIN_PX;
  return Math.min(CINTA_MAX_PX, Math.max(CINTA_MIN_PX, km * PX_POR_KM));
}

type PropsCinta = {
  /** "chica" (12 px de alto, junto a una distancia) o "grande" (22 px, bienvenida). */
  tamano?: "chica" | "grande";
  className?: string;
  style?: React.CSSProperties;
};

/**
 * La cinta métrica pelada: naranja con marcas azules finas cada 8 px y gruesas cada 40 px, y un
 * tope a la derecha. Es decorativa (`aria-hidden`). El largo lo da `className` o `style`.
 */
export function CintaMetrica({ tamano = "chica", className, style }: PropsCinta) {
  return (
    <span
      aria-hidden
      data-cinta=""
      style={style}
      className={cn(
        "box-border block shrink-0",
        tamano === "grande" ? "cinta-regla-grande" : "cinta-regla",
        className,
      )}
    />
  );
}

/**
 * Cinta proporcional a la distancia (30 px por km, mínimo 12, máximo 120) y el texto "a 1,2 km"
 * en IBM Plex Mono. La cinta es `aria-hidden`; el texto es lo que se lee.
 *
 * @example
 * <CintaDistancia km={1.2} />
 */
export function CintaDistancia({
  km,
  className,
  sufijo,
}: {
  km: number;
  className?: string;
  /** Texto después de la distancia, por ejemplo "de vos". */
  sufijo?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <CintaMetrica style={{ width: `${largoCinta(km)}px` }} />
      <span className="font-mono text-[13px] font-semibold text-texto">
        {formatearDistancia(km)}
        {sufijo ? ` ${sufijo}` : ""}
      </span>
    </span>
  );
}

/**
 * Stepper del registro: la cinta ocupa el ancho hasta el paso actual y debajo van las etiquetas en
 * IBM Plex Mono mayúsculas. `actual` empieza en 1.
 *
 * @example
 * <CintaPasos pasos={["Datos", "Oficios", "Documentos", "Normas"]} actual={2} />
 */
export function CintaPasos({
  pasos,
  actual,
  className,
}: {
  pasos: readonly string[];
  /** Paso actual, de 1 a `pasos.length`. */
  actual: number;
  className?: string;
}) {
  const total = pasos.length;
  const paso = Math.min(total, Math.max(1, Math.round(actual)));
  const nombre = pasos[paso - 1] ?? "";
  return (
    <div
      role="group"
      aria-label={`Paso ${paso} de ${total}: ${nombre}`}
      className={cn("flex flex-col gap-2", className)}
    >
      <div aria-hidden className="h-3 rounded-xs bg-divisor">
        <CintaMetrica style={{ width: `${(paso / total) * 100}%` }} className="h-3" />
      </div>
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {pasos.map((etiqueta, i) => (
          <li
            key={etiqueta}
            aria-current={i + 1 === paso ? "step" : undefined}
            className={cn(
              "font-mono text-[11px] font-semibold tracking-[0.4px] uppercase",
              i + 1 === paso ? "text-texto" : "text-texto-terciario",
            )}
          >
            {etiqueta}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Cinta ancha de la bienvenida: se desenrolla de izquierda a derecha (animación `cinta`, 0,9 s,
 * `ease-out`) y queda quieta con `prefers-reduced-motion`.
 */
export function CintaBienvenida({ className }: { className?: string }) {
  return (
    <CintaMetrica
      tamano="grande"
      className={cn("w-full origin-left animate-cinta motion-reduce:animate-none", className)}
    />
  );
}
