"use client";

import { useActionState } from "react";

import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { registrar } from "@/lib/auth/acciones";
import { ESTADO_INICIAL } from "@/lib/auth/estado";

/**
 * Registro mínimo (LAB-16): nombre, email y contraseña. El camino (`rol`) va en un campo oculto y
 * el servidor lo valida contra un enum que no incluye "admin".
 * TODO(LAB-17 / LAB-18): los formularios completos de cliente y profesional reemplazan este.
 */
export function FormularioRegistro({ rol }: { rol: "cliente" | "profesional" }) {
  const [estado, accion, pendiente] = useActionState(registrar, ESTADO_INICIAL);
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
      <input type="hidden" name="rol" value={rol} />
      <Campo
        etiqueta="Nombre"
        name="nombre"
        autoComplete="given-name"
        placeholder="Laura"
        defaultValue={estado.valores?.nombre}
        error={errores.nombre}
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
      <Campo
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={errores.contrasena}
        required
      />
      {estado.mensaje ? (
        <p role="alert" className="text-sm font-semibold text-error">
          {estado.mensaje}
        </p>
      ) : null}
      <Boton
        type="submit"
        variante={rol === "profesional" ? "profesional" : "cliente"}
        tamano="grande"
        bloque
        cargando={pendiente}
      >
        Crear cuenta
      </Boton>
    </form>
  );
}
