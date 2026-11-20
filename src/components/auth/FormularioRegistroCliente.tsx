"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { registrarCliente, type EstadoRegistroCliente } from "@/lib/auth/registro-cliente";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import { esquemaRegistroCliente, type BarrioOpcion } from "@/lib/validaciones/registro-cliente";

import { CampoContrasena } from "./CampoContrasena";
import { ConfirmarEmail } from "./ConfirmarEmail";
import { SelectorBarrio } from "./SelectorBarrio";

const CAMPOS = [
  "nombreCompleto",
  "whatsapp",
  "email",
  "contrasena",
  "barrio",
  "mayorEdad",
] as const;

/**
 * Registro de cliente con email (LAB-17, rehecho en LAB-76): boceto `App-RegistroCliente`.
 * La validación corre dos veces: acá para errores inmediatos y en la Server Action, que es la que vale.
 */
export function FormularioRegistroCliente({ barrios }: { barrios: BarrioOpcion[] }) {
  const [estado, accion, pendiente] = useActionState<EstadoRegistroCliente, FormData>(
    registrarCliente,
    ESTADO_INICIAL,
  );
  const [erroresLocales, setErroresLocales] = useState<Record<string, string | undefined>>({});
  const errores = { ...estado.errores, ...erroresLocales };

  if (estado.confirmarEmail) return <ConfirmarEmail email={estado.confirmarEmail} />;

  function limpiarError(campo: string) {
    setErroresLocales((actuales) => ({ ...actuales, [campo]: undefined }));
  }

  function validarAntes(evento: FormEvent<HTMLFormElement>) {
    const datos = new FormData(evento.currentTarget);
    const entrada = Object.fromEntries(CAMPOS.map((campo) => [campo, datos.get(campo) ?? ""]));
    const resultado = esquemaRegistroCliente.safeParse(entrada);
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
      className="flex flex-col gap-3"
    >
      <Campo
        etiqueta="Nombre"
        name="nombreCompleto"
        autoComplete="given-name"
        placeholder="Carla"
        defaultValue={estado.valores?.nombreCompleto}
        error={errores.nombreCompleto}
        required
      />
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="carla@ejemplo.com"
        defaultValue={estado.valores?.email}
        error={errores.email}
        required
      />
      <CampoContrasena
        etiqueta="Contraseña"
        name="contrasena"
        autoComplete="new-password"
        ayuda="Al menos 8 caracteres."
        error={errores.contrasena}
        required
      />
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

      <label className="flex min-h-11 items-center gap-3 text-[15px] leading-[1.3] text-texto">
        <input
          type="checkbox"
          name="mayorEdad"
          required
          aria-invalid={errores.mayorEdad ? true : undefined}
          aria-describedby={errores.mayorEdad ? "error-mayor-edad" : undefined}
          className="size-6 shrink-0 accent-accion"
        />
        <span>
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

      <div className="flex flex-col pt-1">
        <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
          Crear cuenta
        </Boton>
        <Link
          href="/registro/profesional"
          className="inline-flex min-h-11 items-center self-center text-[15px] font-bold text-texto underline decoration-2 underline-offset-4"
        >
          ¿Ofrecés un oficio? Registrate como profesional
        </Link>
      </div>
    </form>
  );
}
