"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ingresar } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";

import { CampoContrasena } from "./CampoContrasena";

/** Email y contraseña de `/ingresar` (boceto `App-Ingresar`). Errores al lado del campo. */
export function FormularioIngreso({ volver }: { volver?: string }) {
  const [estado, accion, pendiente] = useActionState(ingresar, ESTADO_INICIAL);
  const errores = estado.errores ?? {};

  return (
    <form action={accion} noValidate className="flex flex-col gap-4">
      {volver ? <input type="hidden" name="volver" value={volver} /> : null}
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
        autoComplete="current-password"
        error={errores.contrasena ?? estado.mensaje}
        required
      />
      <Boton type="submit" tamano="grande" bloque cargando={pendiente}>
        Ingresar
      </Boton>
      <Link
        href="/restablecer"
        className="inline-flex min-h-11 items-center self-center text-base font-bold text-texto underline decoration-2 underline-offset-4"
      >
        Me olvidé la contraseña
      </Link>
    </form>
  );
}
