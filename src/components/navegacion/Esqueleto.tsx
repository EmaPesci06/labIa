import { cn } from "@/lib/cn";

/** Bloque gris que pulsa mientras carga. Sin pulso si el sistema pide menos movimiento. */
export function Bloque({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("rounded-tarjeta bg-divisor motion-safe:animate-pulse", className)}
    />
  );
}

/** Esqueleto de una pantalla: título, un buscador y tres tarjetas. */
export function EsqueletoPagina() {
  return (
    <div role="status" aria-label="Cargando" className="flex flex-col gap-5">
      <Bloque className="h-9 w-2/3 max-w-sm" />
      <Bloque className="h-14 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloque className="h-32" />
        <Bloque className="h-32" />
        <Bloque className="h-32" />
      </div>
    </div>
  );
}
