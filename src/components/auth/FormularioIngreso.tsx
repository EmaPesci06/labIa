"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ingresar } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";

/** Email y contraseña de `/ingresar`. Errores al lado del campo; el general arriba del botón. */
export function FormularioIngreso({ volver }: { volver?: string }) {
  const [estado, accion, pendiente] = useActionState(ingresar, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="flex flex-col gap-3.5">
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
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
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        error={errores.contrasena}
        required
      />
      <Link
        href="/restablecer"
        className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-azul underline underline-offset-2"
      >
        ¿Olvidaste tu contraseña?
      </Link>
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Ingresar
      </Boton>
    </form>
  );
}
