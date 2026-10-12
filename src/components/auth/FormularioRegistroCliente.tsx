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

const CAMPOS = ["nombreCompleto", "whatsapp", "email", "contrasena", "barrio"] as const;

/**
 * Registro de cliente con email (LAB-17). La validación corre dos veces: acá para errores
 * inmediatos y en la Server Action, que es la que vale.
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
      onChange={(e) => e.target instanceof HTMLInputElement && limpiarError(e.target.name)}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        etiqueta="Nombre y apellido"
        name="nombreCompleto"
        autoComplete="name"
        placeholder="Laura Fernández"
        defaultValue={estado.valores?.nombreCompleto}
        error={errores.nombreCompleto}
        required
      />
      <Campo
        variante="telefono"
        etiqueta="Celular de WhatsApp"
        name="whatsapp"
        placeholder="223 555-0000"
        defaultValue={estado.valores?.whatsapp}
        error={errores.whatsapp}
        required
      />
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="laura@email.com"
        defaultValue={estado.valores?.email}
        error={errores.email}
        required
      />
      <CampoContrasena
        etiqueta="Contraseña"
        name="contrasena"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={errores.contrasena}
        required
      />
      <SelectorBarrio
        barrios={barrios}
        valorInicial={estado.valores?.barrio}
        error={errores.barrio}
        alCambiar={() => limpiarError("barrio")}
      />

      {estado.emailExistente ? (
        <p role="alert" className="text-sm font-semibold text-error">
          Ya hay una cuenta con ese email. ¿Querés{" "}
          <Link href="/ingresar" className="inline-block py-2 underline underline-offset-2">
            ingresar
          </Link>
          ?
        </p>
      ) : null}
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Crear cuenta
      </Boton>
      <p className="text-center text-[13px] leading-snug text-texto-secundario">
        Al crear tu cuenta aceptás los{" "}
        <Link
          href="/terminos"
          prefetch={false}
          className="inline-block py-2 font-bold text-azul underline underline-offset-2"
        >
          Términos
        </Link>{" "}
        y la{" "}
        <Link
          href="/privacidad"
          prefetch={false}
          className="inline-block py-2 font-bold text-azul underline underline-offset-2"
        >
          Política de privacidad
        </Link>
        .
      </p>
    </form>
  );
}
