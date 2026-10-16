"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { FormularioBaja } from "@/components/emails/FormularioBaja";
import { categoriaSinVerificar, tokenDelFragmento } from "@/lib/emails/fragmento";
import type { CategoriaBaja } from "@/lib/emails/token";

type Carga = { token: string; categoria: CategoriaBaja };

const noSuscribir = () => () => {};

/** `false` en el servidor y en la hidratación; `true` una vez montado en el navegador. */
function useMontado(): boolean {
  return useSyncExternalStore(
    noSuscribir,
    () => true,
    () => false,
  );
}

function leerCarga(fragmento: string): Carga | "invalido" {
  const token = tokenDelFragmento(fragmento);
  const categoria = token ? categoriaSinVerificar(token) : null;
  return token && categoria ? { token, categoria } : "invalido";
}

/**
 * Lee el token del fragmento `#t=` del link de baja (LAB-57). El fragmento no sale del navegador, así
 * que el token no queda en los logs del servidor. Se lee una sola vez y se borra de la barra y del
 * historial apenas se monta.
 */
export function BajaDesdeFragmento({
  conError,
  alNoValido,
}: {
  conError: boolean;
  alNoValido: ReactNode;
}) {
  // Antes de montar no hay nada que mostrar: el servidor no ve el fragmento. Sin JavaScript, el
  // <noscript> dice qué hacer (los navegadores con JavaScript no muestran su contenido).
  const montado = useMontado();
  if (!montado) {
    return (
      <noscript>
        <p className="text-texto-secundario">
          Activá JavaScript o ingresá a Mi cuenta para administrar los avisos.
        </p>
      </noscript>
    );
  }
  return <FormularioDesdeEnlace conError={conError} alNoValido={alNoValido} />;
}

function FormularioDesdeEnlace({
  conError,
  alNoValido,
}: {
  conError: boolean;
  alNoValido: ReactNode;
}) {
  // Se lee una vez, en el primer render del navegador (el estado inicial no tiene efectos).
  const [carga] = useState<Carga | "invalido">(() => leerCarga(window.location.hash));

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, []);

  if (carga === "invalido") return <>{alNoValido}</>;
  return <FormularioBaja token={carga.token} categoria={carga.categoria} conError={conError} />;
}
