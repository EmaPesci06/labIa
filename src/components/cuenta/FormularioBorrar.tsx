"use client";

import { useActionState, useState, type FormEvent } from "react";

import { CampoContrasena } from "@/components/auth/CampoContrasena";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL } from "@/lib/auth/estado";
import { borrarMiCuenta } from "@/lib/cuenta/acciones";
import { erroresPorCampo } from "@/lib/validaciones/auth";
import { esquemaBorrarCuenta, PALABRA_BORRAR } from "@/lib/validaciones/cuenta";

/** Confirmación del borrado: escribir BORRAR y, si ingresa con email, la contraseña. */
export function FormularioBorrar({ pedirContrasena }: { pedirContrasena: boolean }) {
  const [estado, accion, pendiente] = useActionState(borrarMiCuenta, ESTADO_INICIAL);
  const [locales, setLocales] = useState<Record<string, string | undefined>>({});
  const errores = { ...estado.errores, ...locales };

  function validarAntes(evento: FormEvent<HTMLFormElement>) {
    const datos = new FormData(evento.currentTarget);
    const r = esquemaBorrarCuenta.safeParse({
      confirmacion: datos.get("confirmacion") ?? "",
      contrasena: (datos.get("contrasena") as string | null) || undefined,
    });
    const faltaContrasena = pedirContrasena && !datos.get("contrasena");
    if (r.success && !faltaContrasena) {
      setLocales({});
      return;
    }
    evento.preventDefault();
    setLocales({
      ...(r.success ? {} : erroresPorCampo(r.error)),
      ...(faltaContrasena ? { contrasena: "Ingresá tu contraseña para confirmar." } : {}),
    });
  }

  return (
    <form
      action={accion}
      onSubmit={validarAntes}
      onChange={(e) =>
        e.target instanceof HTMLInputElement &&
        setLocales((a) => ({ ...a, [e.target.name]: undefined }))
      }
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        etiqueta={`Escribí ${PALABRA_BORRAR} para confirmar`}
        name="confirmacion"
        autoComplete="off"
        autoCapitalize="characters"
        error={errores.confirmacion}
        required
      />
      {pedirContrasena ? (
        <CampoContrasena
          etiqueta="Tu contraseña"
          name="contrasena"
          autoComplete="current-password"
          error={errores.contrasena}
          required
        />
      ) : (
        <p className="text-sm text-texto-secundario">
          Ingresaste con Google. Si hace mucho que ingresaste, te vamos a pedir que vuelvas a
          ingresar antes de borrar.
        </p>
      )}
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <button
        type="submit"
        aria-busy={pendiente || undefined}
        className="inline-flex min-h-[52px] items-center justify-center rounded-boton bg-error px-5 text-base font-bold text-sobre-azul hover:opacity-90 active:opacity-80 disabled:opacity-50 aria-busy:pointer-events-none"
      >
        {pendiente ? "Borrando…" : "Borrar mi cuenta para siempre"}
      </button>
      <Boton href="/cuenta" variante="secundario" tamano="grande" bloque>
        Cancelar
      </Boton>
    </form>
  );
}
