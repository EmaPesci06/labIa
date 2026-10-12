"use client";

import { useActionState, useState, type FormEvent } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { completarRegistroCliente, type EstadoRegistroCliente } from "@/lib/auth/registro-cliente";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import { esquemaCompletarCliente, type BarrioOpcion } from "@/lib/validaciones/registro-cliente";

import { SelectorBarrio } from "./SelectorBarrio";

/** Paso final para quien entró con Google: solo WhatsApp y barrio. */
export function FormularioCompletarCliente({ barrios }: { barrios: BarrioOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistroCliente, FormData>(
    completarRegistroCliente,
    ESTADO_INICIAL,
  );
  const [erroresLocales, setErroresLocales] = useState<Record<string, string | undefined>>({});
  const errores = { ...estado.errores, ...erroresLocales };

  function validarAntes(evento: FormEvent<HTMLFormElement>) {
    const datos = new FormData(evento.currentTarget);
    const resultado = esquemaCompletarCliente.safeParse({
      whatsapp: datos.get("whatsapp") ?? "",
      barrio: datos.get("barrio") ?? "",
    });
    if (resultado.success) {
      setErroresLocales({});
      return;
    }
    evento.preventDefault();
    setErroresLocales(erroresPorCampo(resultado.error));
  }

  return (
    <form action={accion} onSubmit={validarAntes} noValidate className="flex flex-col gap-3.5">
      <Campo
        variante="telefono"
        etiqueta="Celular de WhatsApp"
        name="whatsapp"
        placeholder="223 555-0000"
        defaultValue={estado.valores?.whatsapp}
        error={errores.whatsapp}
        required
      />
      <SelectorBarrio
        barrios={barrios}
        valorInicial={estado.valores?.barrio}
        error={errores.barrio}
      />
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Terminar
      </Boton>
    </form>
  );
}
