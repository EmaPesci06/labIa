"use client";

import { useActionState, useState, type FormEvent } from "react";

import { CampoContrasena } from "@/components/auth/CampoContrasena";
import { SelectorBarrio } from "@/components/auth/SelectorBarrio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/lib/auth/estado";
import { cambiarContrasena, cambiarEmail, guardarDatos } from "@/lib/cuenta/acciones";
import { erroresPorCampo, esquemaNuevaContrasena } from "@/lib/validaciones/auth";
import {
  esquemaCambiarEmail,
  esquemaContrasenaActual,
  esquemaDatosCuenta,
} from "@/lib/validaciones/cuenta";
import type { BarrioOpcion } from "@/lib/validaciones/registro-cliente";

function Resultado({ estado }: { estado: EstadoFormulario }) {
  if (estado.mensaje) {
    return (
      <p role="alert" className="text-sm font-semibold text-error">
        {estado.mensaje}
      </p>
    );
  }
  if (estado.exito) {
    return (
      <p role="status" className="text-sm font-semibold text-exito">
        {estado.exito}
      </p>
    );
  }
  return null;
}

/** Valida en el navegador con el mismo esquema Zod y, si falla, no manda el formulario. */
function useValidacion<T>(
  validar: (
    datos: FormData,
  ) => { success: true; data: T } | { success: false; errores: Record<string, string | undefined> },
) {
  const [locales, setLocales] = useState<Record<string, string | undefined>>({});
  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    const resultado = validar(new FormData(evento.currentTarget));
    if (resultado.success) {
      setLocales({});
      return;
    }
    evento.preventDefault();
    setLocales(resultado.errores);
  }
  const limpiar = (campo: string) => setLocales((a) => ({ ...a, [campo]: undefined }));
  return { locales, alEnviar, limpiar };
}

const valor = (datos: FormData, clave: string) => {
  const v = datos.get(clave);
  return typeof v === "string" ? v : "";
};

type PropsDatos = {
  barrios: BarrioOpcion[];
  inicial: { nombreCompleto: string; whatsapp: string; barrio: string };
};

/** Nombre, WhatsApp y barrio. Valida igual que el registro. */
export function FormularioDatos({ barrios, inicial }: PropsDatos) {
  const [estado, accion, pendiente] = useActionState(guardarDatos, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaDatosCuenta.safeParse({
      nombreCompleto: valor(datos, "nombreCompleto"),
      whatsapp: valor(datos, "whatsapp"),
      barrio: valor(datos, "barrio"),
    });
    return r.success
      ? { success: true, data: r.data }
      : { success: false, errores: erroresPorCampo(r.error) };
  });
  const errores = { ...estado.errores, ...locales };
  const v = estado.valores ?? inicial;

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) => e.target instanceof HTMLInputElement && limpiar(e.target.name)}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        etiqueta="Nombre y apellido"
        name="nombreCompleto"
        autoComplete="name"
        defaultValue={v.nombreCompleto}
        error={errores.nombreCompleto}
        required
      />
      <Campo
        variante="telefono"
        etiqueta="Celular de WhatsApp"
        name="whatsapp"
        placeholder="223 555-0000"
        defaultValue={v.whatsapp}
        error={errores.whatsapp}
        required
      />
      <SelectorBarrio
        barrios={barrios}
        valorInicial={v.barrio}
        error={errores.barrio}
        alCambiar={() => limpiar("barrio")}
      />
      <Resultado estado={estado} />
      <Boton type="submit" variante="cliente" tamano="grande" bloque cargando={pendiente}>
        Guardar cambios
      </Boton>
    </form>
  );
}

/** Cambio de email con confirmación por mail. */
export function FormularioEmail({ emailActual }: { emailActual: string }) {
  const [estado, accion, pendiente] = useActionState(cambiarEmail, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaCambiarEmail.safeParse({
      email: valor(datos, "email"),
      actual: valor(datos, "actual"),
    });
    return r.success
      ? { success: true, data: r.data }
      : { success: false, errores: erroresPorCampo(r.error) };
  });
  const errores = { ...estado.errores, ...locales };

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) => e.target instanceof HTMLInputElement && limpiar(e.target.name)}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <Campo
        etiqueta="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={estado.valores?.email ?? emailActual}
        ayuda="Te mandamos un mail a la dirección nueva para confirmar el cambio."
        error={errores.email}
        required
      />
      <CampoContrasena
        etiqueta="Tu contraseña actual"
        name="actual"
        autoComplete="current-password"
        error={errores.actual}
        required
      />
      <Resultado estado={estado} />
      <Boton type="submit" variante="secundario" tamano="grande" bloque cargando={pendiente}>
        Cambiar email
      </Boton>
    </form>
  );
}

/** Cambio de contraseña. */
export function FormularioContrasena() {
  const [estado, accion, pendiente] = useActionState(cambiarContrasena, ESTADO_INICIAL);
  const { locales, alEnviar, limpiar } = useValidacion((datos) => {
    const r = esquemaNuevaContrasena.safeParse({
      contrasena: valor(datos, "contrasena"),
      repetir: valor(datos, "repetir"),
    });
    const actual = esquemaContrasenaActual.safeParse({ actual: valor(datos, "actual") });
    if (r.success && actual.success) return { success: true, data: r.data };
    return {
      success: false,
      errores: {
        ...(actual.success ? {} : erroresPorCampo(actual.error)),
        ...(r.success ? {} : erroresPorCampo(r.error)),
      },
    };
  });
  const errores = { ...estado.errores, ...locales };

  return (
    <form
      action={accion}
      onSubmit={alEnviar}
      onChange={(e) => e.target instanceof HTMLInputElement && limpiar(e.target.name)}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <CampoContrasena
        etiqueta="Tu contraseña actual"
        name="actual"
        autoComplete="current-password"
        error={errores.actual}
        required
      />
      <CampoContrasena
        etiqueta="Contraseña nueva"
        name="contrasena"
        autoComplete="new-password"
        ayuda="Al menos 8 caracteres."
        error={errores.contrasena}
        required
      />
      <CampoContrasena
        etiqueta="Repetí la contraseña nueva"
        name="repetir"
        autoComplete="new-password"
        error={errores.repetir}
        required
      />
      <Resultado estado={estado} />
      <Boton type="submit" variante="secundario" tamano="grande" bloque cargando={pendiente}>
        Cambiar contraseña
      </Boton>
    </form>
  );
}
