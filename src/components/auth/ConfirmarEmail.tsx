"use client";

import { useActionState, useEffect, useState } from "react";

import { Boton } from "@/components/ui/Boton";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { reenviarConfirmacion, type EstadoRegistroCliente } from "@/lib/auth/registro-cliente";

const ESPERA_SEGUNDOS = 60;

/** "Te mandamos un mail a …" con reenvío (máximo uno cada 60 segundos). */
export function ConfirmarEmail({ email }: { email: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistroCliente, FormData>(
    reenviarConfirmacion,
    ESTADO_INICIAL,
  );
  // El primer mail ya salió al registrarse: el reenvío se habilita al minuto.
  const [restan, setRestan] = useState(ESPERA_SEGUNDOS);
  const [ultimoEstado, setUltimoEstado] = useState(estado);

  if (estado !== ultimoEstado) {
    setUltimoEstado(estado);
    if (estado.reenvio === "enviado") setRestan(ESPERA_SEGUNDOS);
  }

  useEffect(() => {
    if (restan <= 0) return;
    const temporizador = setTimeout(() => setRestan((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [restan]);

  return (
    <div className="flex flex-col gap-4">
      <p
        role="status"
        className="rounded-campo bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave"
      >
        Te mandamos un mail a {email}. Tocá el link para activar tu cuenta.
      </p>
      <form action={accion} className="flex flex-col gap-2">
        <input type="hidden" name="email" value={email} />
        <Boton
          type="submit"
          variante="secundario"
          tamano="grande"
          bloque
          cargando={pendiente}
          disabled={restan > 0 || pendiente}
        >
          {restan > 0 ? `Reenviar mail (en ${restan} s)` : "Reenviar mail"}
        </Boton>
        {estado.reenvio === "enviado" ? (
          <p role="status" className="text-sm font-semibold text-sobre-exito-suave">
            Listo, te lo mandamos de nuevo.
          </p>
        ) : null}
        {estado.reenvio === "demasiado-pronto" ? (
          <p role="alert" className="text-sm font-semibold text-error">
            Esperá un minuto antes de pedir otro mail.
          </p>
        ) : null}
        {estado.reenvio === "error" ? (
          <p role="alert" className="text-sm font-semibold text-error">
            No pudimos reenviar el mail. Probá de nuevo en unos minutos.
          </p>
        ) : null}
      </form>
    </div>
  );
}
