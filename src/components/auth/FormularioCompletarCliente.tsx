"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";

import { Checkbox } from "@/components/shadcn/checkbox";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { completarRegistroCliente, type EstadoRegistroCliente } from "@/lib/auth/registro-cliente";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import { esquemaCompletarCliente, type BarrioOpcion } from "@/lib/validaciones/registro-cliente";

import { SelectorBarrio } from "./SelectorBarrio";

/**
 * Paso final para quien entró con Google (o no completó el alta): WhatsApp, barrio y la casilla de
 * mayor de 18 y términos. Sin esa casilla guardada en el servidor, la cuenta no usa la plataforma.
 */
export function FormularioCompletarCliente({ barrios }: { barrios: BarrioOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistroCliente, FormData>(
    completarRegistroCliente,
    ESTADO_INICIAL,
  );
  const [erroresLocales, setErroresLocales] = useState<Record<string, string | undefined>>({});
  const errores = { ...estado.errores, ...erroresLocales };

  function limpiarError(campo: string) {
    setErroresLocales((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  function validarAntes(evento: FormEvent<HTMLFormElement>) {
    const datos = new FormData(evento.currentTarget);
    const resultado = esquemaCompletarCliente.safeParse({
      whatsapp: datos.get("whatsapp") ?? "",
      barrio: datos.get("barrio") ?? "",
      mayorEdad: datos.get("mayorEdad") ?? "",
    });
    if (resultado.success) {
      setErroresLocales({});
      return;
    }
    evento.preventDefault();
    setErroresLocales(erroresPorCampo(resultado.error));
  }

  return (
    <form
      action={accion}
      onSubmit={validarAntes}
      onChange={(e) =>
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) &&
        limpiarError(e.target.name)
      }
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        variante="telefono"
        etiqueta="Tu WhatsApp"
        name="whatsapp"
        placeholder="223 555 0123"
        ayuda="Lo ven solo los profesionales que elijas."
        defaultValue={estado.valores?.whatsapp}
        error={errores.whatsapp}
        required
      />
      <SelectorBarrio
        barrios={barrios}
        valorInicial={estado.valores?.barrio}
        error={errores.barrio}
        alCambiar={() => limpiarError("barrio")}
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] leading-[1.3] text-texto">
        <Checkbox
          name="mayorEdad"
          required
          aria-labelledby="etiqueta-mayor-edad"
          aria-invalid={errores.mayorEdad ? true : undefined}
          aria-describedby={errores.mayorEdad ? "error-mayor-edad" : undefined}
          onCheckedChange={() => limpiarError("mayorEdad")}
          className="size-6 shrink-0 border-2 border-texto bg-campo"
        />
        <span id="etiqueta-mayor-edad">
          Soy mayor de 18 y acepto los{" "}
          <Link
            href="/terminos"
            prefetch={false}
            className="font-bold text-texto underline decoration-2 underline-offset-4"
          >
            términos
          </Link>{" "}
          y la{" "}
          <Link
            href="/privacidad"
            prefetch={false}
            className="font-bold text-texto underline decoration-2 underline-offset-4"
          >
            privacidad
          </Link>
          .
        </span>
      </label>
      {errores.mayorEdad ? (
        <p id="error-mayor-edad" className="-mt-1 text-[15px] font-bold text-error">
          {errores.mayorEdad}
        </p>
      ) : null}
      {estado.mensaje ? (
        <p role="alert" className="text-[15px] font-bold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
        Terminar
      </Boton>
    </form>
  );
}
