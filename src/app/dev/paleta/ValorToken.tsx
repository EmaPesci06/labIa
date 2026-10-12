"use client";

/** Muestra el valor real de una variable CSS en el bloque donde está (lo lee del navegador). */
export function ValorToken({ variable }: { variable: string }) {
  return (
    <span
      className="font-mono text-xs font-medium text-texto-secundario uppercase"
      ref={(nodo) => {
        if (nodo) nodo.textContent = getComputedStyle(nodo).getPropertyValue(variable).trim();
      }}
    />
  );
}
