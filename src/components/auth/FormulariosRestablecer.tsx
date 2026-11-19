"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { guardarNuevaContrasena, pedirRestablecer } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";

import { CampoContrasena } from "./CampoContrasena";

/** Paso 1 de `/restablecer`: pide el email y manda el link de recuperación (boceto `App-Restablecer`). */
export function FormularioPedirRestablecer() {
  const [estado, accion, pendiente] = useActionState(pedirRestablecer, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  if (estado.exito) {
    return (
      <p role="status" className="rounded-campo bg-sol p-4 text-[15px] font-bold text-sobre-sol">
        {estado.exito}
      </p>
    );
  }

  return (
    <form action={accion} noValidate className="flex flex-col gap-4">
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
      {estado.mensaje ? (
        <p role="alert" className="text-[15px] font-bold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
        Mandarme el enlace
      </Boton>
    </form>
  );
}

/** Paso 2: se llega desde el link del email, con una sesión de recuperación. */
export function FormularioNuevaContrasena() {
  const [estado, accion, pendiente] = useActionState(guardarNuevaContrasena, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  return (
    <Tarjeta className="flex flex-col gap-3.5 p-[18px]">
      <form action={accion} noValidate className="flex flex-col gap-3.5">
        <CampoContrasena
          etiqueta="Contraseña nueva"
          name="contrasena"
          autoComplete="new-password"
          ayuda="Al menos 8 caracteres."
          error={errores.contrasena}
          required
        />
        <CampoContrasena
          etiqueta="Repetí la contraseña"
          name="repetir"
          autoComplete="new-password"
          error={errores.repetir}
          required
        />
        {estado.mensaje ? (
          <p role="alert" className="text-[15px] font-bold text-error">
            {estado.mensaje}
          </p>
        ) : null}
        <Boton type="submit" variante="secundario" bloque cargando={pendiente}>
          Guardar y entrar
        </Boton>
      </form>
    </Tarjeta>
  );
}
