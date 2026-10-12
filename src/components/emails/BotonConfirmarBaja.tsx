"use client";

import { Boton } from "@/components/ui/Boton";

/**
 * Botón de envío de `/baja`. `Boton` crea un manejador interno (`onClick`), que no se puede
 * armar dentro de un Server Component: por eso vive en un componente de cliente.
 */
export function BotonConfirmarBaja() {
  return (
    <Boton type="submit" variante="cliente" tamano="grande" bloque>
      Confirmar la baja
    </Boton>
  );
}
