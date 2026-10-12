"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { guardarNuevaContrasena, pedirRestablecer } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";

/** Paso 1 de `/restablecer`: pide el email y manda el link de recuperación. */
export function FormularioPedirRestablecer() {
  const [estado, accion, pendiente] = useActionState(pedirRestablecer, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  if (estado.exito) {
    return (
      <p
        role="status"
        className="rounded-campo bg-exito-suave p-4 text-[15px] font-semibold text-sobre-exito-suave"
      >
        {estado.exito}
      </p>
    );
  }

  return (
    <form action={accion} noValidate className="flex flex-col gap-3.5">
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
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Enviar enlace
      </Boton>
    </form>
  );
}

/** Paso 2: se llega desde el link del email, con una sesión de recuperación. */
export function FormularioNuevaContrasena() {
  const [estado, accion, pendiente] = useActionState(guardarNuevaContrasena, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="flex flex-col gap-3.5">
      <Campo
        etiqueta="Contraseña nueva"
        name="contrasena"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={errores.contrasena}
        required
      />
      <Campo
        etiqueta="Repetí la contraseña"
        name="repetir"
        type="password"
        autoComplete="new-password"
        error={errores.repetir}
        required
      />
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Guardar contraseña
      </Boton>
    </form>
  );
}
